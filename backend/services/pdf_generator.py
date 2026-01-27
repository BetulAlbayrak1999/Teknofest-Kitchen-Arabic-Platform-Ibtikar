"""
خدمة توليد ملفات PDF
"""
import os
import io
from datetime import datetime
from typing import List, Optional
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm, mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, Image
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.enums import TA_RIGHT, TA_CENTER, TA_LEFT

# محاولة تسجيل خط عربي
try:
    import arabic_reshaper
    from bidi.algorithm import get_display
    ARABIC_SUPPORT = True
except ImportError:
    ARABIC_SUPPORT = False

# محاولة تسجيل خط عربي من النظام
ARABIC_FONT_NAME = "Helvetica"  # Default fallback
ARABIC_FONT_REGISTERED = False

def register_arabic_font():
    """تسجيل خط عربي للـ PDF"""
    global ARABIC_FONT_NAME, ARABIC_FONT_REGISTERED

    if ARABIC_FONT_REGISTERED:
        return

    # قائمة الخطوط العربية المحتملة على Windows
    possible_fonts = [
        # Windows Arabic fonts
        ("C:/Windows/Fonts/arial.ttf", "Arial"),
        ("C:/Windows/Fonts/tahoma.ttf", "Tahoma"),
        ("C:/Windows/Fonts/times.ttf", "Times"),
        # Custom font in project
        (os.path.join(os.path.dirname(__file__), "..", "fonts", "Amiri-Regular.ttf"), "Amiri"),
        (os.path.join(os.path.dirname(__file__), "..", "fonts", "NotoSansArabic-Regular.ttf"), "NotoSansArabic"),
    ]

    for font_path, font_name in possible_fonts:
        if os.path.exists(font_path):
            try:
                pdfmetrics.registerFont(TTFont(font_name, font_path))
                ARABIC_FONT_NAME = font_name
                ARABIC_FONT_REGISTERED = True
                print(f"تم تسجيل الخط: {font_name}")
                return
            except Exception as e:
                print(f"فشل تسجيل الخط {font_name}: {e}")
                continue

    print("تحذير: لم يتم العثور على خط عربي، سيتم استخدام الخط الافتراضي")

# تسجيل الخط عند تحميل الوحدة
register_arabic_font()


class PDFService:
    """خدمة توليد ملفات PDF"""

    def __init__(self):
        self.page_size = A4
        self.margin = 2 * cm

    def reshape_arabic(self, text: str) -> str:
        """تحويل النص العربي ليظهر بشكل صحيح"""
        if not text:
            return ""
        if ARABIC_SUPPORT:
            try:
                reshaped = arabic_reshaper.reshape(str(text))
                return get_display(reshaped)
            except Exception as e:
                print(f"خطأ في تشكيل النص: {e}")
                return str(text)
        return str(text)

    def get_styles(self):
        """إنشاء أنماط النص"""
        styles = getSampleStyleSheet()

        # عنوان رئيسي
        styles.add(ParagraphStyle(
            name='ArabicTitle',
            fontName=ARABIC_FONT_NAME,
            fontSize=24,
            leading=30,
            alignment=TA_CENTER,
            spaceAfter=20,
            textColor=colors.HexColor('#667eea')
        ))

        # عنوان فرعي
        styles.add(ParagraphStyle(
            name='ArabicHeading',
            fontName=ARABIC_FONT_NAME,
            fontSize=16,
            leading=22,
            alignment=TA_RIGHT,
            spaceAfter=12,
            spaceBefore=12,
            textColor=colors.HexColor('#333333')
        ))

        # نص عادي
        styles.add(ParagraphStyle(
            name='ArabicBody',
            fontName=ARABIC_FONT_NAME,
            fontSize=12,
            leading=18,
            alignment=TA_RIGHT,
            spaceAfter=8
        ))

        # نص صغير
        styles.add(ParagraphStyle(
            name='ArabicSmall',
            fontName=ARABIC_FONT_NAME,
            fontSize=10,
            leading=14,
            alignment=TA_RIGHT,
            textColor=colors.gray
        ))

        return styles

    def generate_project_pdf(self, project_data: dict) -> bytes:
        """توليد PDF لمشروع واحد"""
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=self.page_size,
            rightMargin=self.margin,
            leftMargin=self.margin,
            topMargin=self.margin,
            bottomMargin=self.margin
        )

        styles = self.get_styles()
        elements = []

        # العنوان
        title = self.reshape_arabic(f"مشروع: {project_data.get('title', '')}")
        elements.append(Paragraph(title, styles['ArabicTitle']))
        elements.append(Spacer(1, 20))

        # معلومات الفريق
        team_info = self.reshape_arabic(f"الفريق: {project_data.get('team_name', '')}")
        elements.append(Paragraph(team_info, styles['ArabicHeading']))

        field = self.reshape_arabic(f"المجال: {project_data.get('field', '')}")
        elements.append(Paragraph(field, styles['ArabicBody']))
        elements.append(Spacer(1, 15))

        # المشكلة
        problem_title = self.reshape_arabic("المشكلة التي يحلها المشروع:")
        elements.append(Paragraph(problem_title, styles['ArabicHeading']))

        problem = self.reshape_arabic(project_data.get('problem_statement', ''))
        elements.append(Paragraph(problem, styles['ArabicBody']))
        elements.append(Spacer(1, 15))

        # الوصف التقني
        desc_title = self.reshape_arabic("الوصف التقني:")
        elements.append(Paragraph(desc_title, styles['ArabicHeading']))

        description = self.reshape_arabic(project_data.get('technical_description', ''))
        elements.append(Paragraph(description, styles['ArabicBody']))
        elements.append(Spacer(1, 15))

        # المرجع العلمي
        ref_title = self.reshape_arabic("المرجع العلمي:")
        elements.append(Paragraph(ref_title, styles['ArabicHeading']))

        reference = self.reshape_arabic(project_data.get('scientific_reference', ''))
        elements.append(Paragraph(reference, styles['ArabicBody']))
        elements.append(Spacer(1, 20))

        # التقييم (إن وجد)
        if project_data.get('total_score') is not None:
            eval_title = self.reshape_arabic("التقييم:")
            elements.append(Paragraph(eval_title, styles['ArabicHeading']))

            score_text = self.reshape_arabic(
                f"النتيجة الإجمالية: {project_data.get('total_score', 0)}/100"
            )
            elements.append(Paragraph(score_text, styles['ArabicBody']))

            admin_score = self.reshape_arabic(
                f"تقييم الإداريين: {project_data.get('admin_score', 0)}/75"
            )
            elements.append(Paragraph(admin_score, styles['ArabicBody']))

            ai_score = self.reshape_arabic(
                f"تقييم AI: {project_data.get('ai_score', 0)}/25"
            )
            elements.append(Paragraph(ai_score, styles['ArabicBody']))

        # التاريخ
        elements.append(Spacer(1, 30))
        date_text = self.reshape_arabic(
            f"تاريخ التقرير: {datetime.now().strftime('%Y-%m-%d %H:%M')}"
        )
        elements.append(Paragraph(date_text, styles['ArabicSmall']))

        doc.build(elements)
        buffer.seek(0)
        return buffer.getvalue()

    def generate_projects_report_pdf(self, projects: List[dict]) -> bytes:
        """توليد PDF لتقرير جميع المشاريع"""
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=self.page_size,
            rightMargin=self.margin,
            leftMargin=self.margin,
            topMargin=self.margin,
            bottomMargin=self.margin
        )

        styles = self.get_styles()
        elements = []

        # العنوان الرئيسي
        title = self.reshape_arabic("تقرير المشاريع - مسابقات تكنوفيست")
        elements.append(Paragraph(title, styles['ArabicTitle']))
        elements.append(Spacer(1, 10))

        # معلومات التقرير
        info = self.reshape_arabic(f"عدد المشاريع: {len(projects)}")
        elements.append(Paragraph(info, styles['ArabicBody']))

        date_text = self.reshape_arabic(
            f"تاريخ التقرير: {datetime.now().strftime('%Y-%m-%d')}"
        )
        elements.append(Paragraph(date_text, styles['ArabicSmall']))
        elements.append(Spacer(1, 20))

        # جدول المشاريع
        table_data = [
            [
                self.reshape_arabic('النتيجة'),
                self.reshape_arabic('المجال'),
                self.reshape_arabic('الفريق'),
                self.reshape_arabic('المشروع'),
                '#'
            ]
        ]

        for i, project in enumerate(projects, 1):
            project_title = project.get('title', '')
            if len(project_title) > 30:
                project_title = project_title[:30] + '...'

            table_data.append([
                str(project.get('total_score', '-') or '-'),
                self.reshape_arabic(project.get('field', '')),
                self.reshape_arabic(project.get('team_name', '')),
                self.reshape_arabic(project_title),
                str(i)
            ])

        table = Table(table_data, colWidths=[60, 80, 100, 150, 30])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#667eea')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, -1), ARABIC_FONT_NAME),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('FONTSIZE', (0, 1), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.white),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#dddddd')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f5f5f5')])
        ]))

        elements.append(table)

        doc.build(elements)
        buffer.seek(0)
        return buffer.getvalue()

    def generate_team_pdf(self, team_data: dict) -> bytes:
        """توليد PDF لمعلومات فريق"""
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=self.page_size,
            rightMargin=self.margin,
            leftMargin=self.margin,
            topMargin=self.margin,
            bottomMargin=self.margin
        )

        styles = self.get_styles()
        elements = []

        # العنوان
        title = self.reshape_arabic(f"فريق: {team_data.get('team_name', '')}")
        elements.append(Paragraph(title, styles['ArabicTitle']))
        elements.append(Spacer(1, 20))

        # معلومات الفريق
        field = self.reshape_arabic(f"المجال: {team_data.get('field', '')}")
        elements.append(Paragraph(field, styles['ArabicBody']))

        reg_type = self.reshape_arabic(f"نوع التسجيل: {team_data.get('registration_type', '')}")
        elements.append(Paragraph(reg_type, styles['ArabicBody']))
        elements.append(Spacer(1, 15))

        # الأعضاء
        members_title = self.reshape_arabic("أعضاء الفريق:")
        elements.append(Paragraph(members_title, styles['ArabicHeading']))

        members = team_data.get('members', [])
        for member in members:
            leader_mark = " (مشرف الفريق)" if member.get('is_leader') else ""
            member_text = self.reshape_arabic(
                f"• {member.get('full_name', '')}{leader_mark} - {member.get('email', '')} - {member.get('phone', '')}"
            )
            elements.append(Paragraph(member_text, styles['ArabicBody']))

        # فكرة المشروع
        if team_data.get('initial_idea'):
            elements.append(Spacer(1, 15))
            idea_title = self.reshape_arabic("فكرة المشروع الأولية:")
            elements.append(Paragraph(idea_title, styles['ArabicHeading']))

            idea = self.reshape_arabic(team_data.get('initial_idea', ''))
            elements.append(Paragraph(idea, styles['ArabicBody']))

        doc.build(elements)
        buffer.seek(0)
        return buffer.getvalue()


# إنشاء نسخة من الخدمة
pdf_service = PDFService()
