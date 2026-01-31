"""
خدمة التقييم بالذكاء الاصطناعي - DeepSeek API
"""
import os
import json
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

# مفتاح DeepSeek API
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
DEEPSEEK_BASE_URL = "https://api.deepseek.com"


class AIEvaluationService:
    """خدمة تقييم المشاريع بالذكاء الاصطناعي - DeepSeek"""

    def __init__(self):
        self.api_key = DEEPSEEK_API_KEY
        self.base_url = DEEPSEEK_BASE_URL
        self.max_score = 50  # الحد الأقصى للنقاط
    
    def create_evaluation_prompt(
        self,
        title: str,
        problem_statement: str,
        technical_description: str,
        scientific_reference: str,
        field: str
    ) -> str:
        """إنشاء نص الطلب للتقييم"""
        prompt = f"""
أنت خبير في تقييم المشاريع التقنية والابتكارية. قم بتقييم المشروع التالي:

📌 **عنوان المشروع:** {title}

🎯 **المجال:** {field}

❓ **المشكلة التي يحلها المشروع:**
{problem_statement}

💻 **الوصف التقني التفصيلي:**
{technical_description}

📚 **المرجع العلمي:**
{scientific_reference}

---

قم بتقييم المشروع وفق المعايير التالية (مجموع 25 نقطة):

1. **الابتكار والإبداع** (0-5 نقاط): هل الفكرة مبتكرة وجديدة؟
2. **الجدوى التقنية** (0-5 نقطة): هل المشروع قابل للتنفيذ تقنياً؟
3. **حل المشكلة** (0-5 نقاط): هل يحل المشروع مشكلة حقيقية بشكل فعال؟
4. **الوصف التقني** (0-5 نقاط): هل الوصف التقني دقيق ومفصل؟
5. **المرجع العلمي** (0-5 نقاط): هل المرجع العلمي مناسب وداعم للفكرة؟

أجب بصيغة JSON فقط كالتالي:
{{
    "total_score": <مجموع النقاط من 25>,
    "detailed_scores": {{
        "innovation": <نقاط الابتكار>,
        "feasibility": <نقاط الجدوى>,
        "problem_solving": <نقاط حل المشكلة>,
        "technical_description": <نقاط الوصف التقني>,
        "scientific_reference": <نقاط المرجع العلمي>
    }},
    "notes": "<ملاحظات وتوصيات للفريق باللغة العربية>"
}}
"""
        return prompt
    
    async def evaluate_project(
        self,
        title: str,
        problem_statement: str,
        technical_description: str,
        scientific_reference: str,
        field: str
    ) -> dict:
        """تقييم المشروع باستخدام AI"""
        
        # إذا لم يكن هناك مفتاح API، نستخدم تقييم تجريبي
        if not self.api_key:
            return self._mock_evaluation(title, technical_description)

        try:
            import openai

            # استخدام DeepSeek API (متوافق مع OpenAI)
            client = openai.OpenAI(
                api_key=self.api_key,
                base_url=self.base_url
            )

            prompt = self.create_evaluation_prompt(
                title=title,
                problem_statement=problem_statement,
                technical_description=technical_description,
                scientific_reference=scientific_reference,
                field=field
            )

            response = client.chat.completions.create(
                model="deepseek-chat",  # نموذج DeepSeek
                messages=[
                    {
                        "role": "system",
                        "content": "أنت خبير في تقييم المشاريع التقنية. أجب دائماً بصيغة JSON فقط."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.3,
                max_tokens=1000
            )
            
            result_text = response.choices[0].message.content
            
            # محاولة استخراج JSON
            try:
                # إزالة أي نص قبل أو بعد JSON
                start_idx = result_text.find('{')
                end_idx = result_text.rfind('}') + 1
                json_str = result_text[start_idx:end_idx]
                result = json.loads(json_str)
                
                return {
                    "success": True,
                    "score": min(result.get("total_score", 25), self.max_score),
                    "detailed_scores": result.get("detailed_scores", {}),
                    "notes": result.get("notes", "")
                }
            except json.JSONDecodeError:
                return self._mock_evaluation(title, technical_description)
                
        except Exception as e:
            print(f"خطأ في تقييم AI: {str(e)}")
            return self._mock_evaluation(title, technical_description)
    
    def _mock_evaluation(self, title: str, description: str) -> dict:
        """تقييم تجريبي في حالة عدم توفر API"""
        import hashlib
        
        # إنشاء نقاط شبه عشوائية بناءً على المحتوى
        hash_input = f"{title}{description}".encode()
        hash_value = int(hashlib.md5(hash_input).hexdigest(), 16)
        
        base_score = 25 + (hash_value % 20)  # 25-44
        
        # توزيع النقاط
        innovation = min(10, 5 + (hash_value % 6))
        feasibility = min(15, 8 + (hash_value % 8))
        problem_solving = min(10, 5 + (hash_value % 6))
        tech_desc = min(10, 5 + (len(description) // 500))
        reference = min(5, 2 + (hash_value % 4))
        
        total = innovation + feasibility + problem_solving + tech_desc + reference
        
        notes = """
تقييم أولي للمشروع:
- الفكرة تبدو واعدة وقابلة للتطوير
- يُنصح بإضافة المزيد من التفاصيل التقنية
- يُفضل توضيح خطة التنفيذ بشكل أكبر
- المرجع العلمي يحتاج لمصادر إضافية
        """.strip()
        
        return {
            "success": True,
            "score": min(total, self.max_score),
            "detailed_scores": {
                "innovation": innovation,
                "feasibility": feasibility,
                "problem_solving": problem_solving,
                "technical_description": tech_desc,
                "scientific_reference": reference
            },
            "notes": notes
        }
    
    def calculate_final_score(
        self,
        admin_evaluations: list,  # [{"score": x, "weight": y}, ...]
        ai_score: float
    ) -> dict:
        """حساب النتيجة النهائية"""
        # 75% للإداريين (موزعة حسب الأوزان)
        # 25% لل AI
        
        if admin_evaluations:
            total_weight = sum(e.get("weight", 10) for e in admin_evaluations)
            weighted_admin_score = sum(
                e.get("score", 0) * e.get("weight", 10) 
                for e in admin_evaluations
            ) / total_weight if total_weight > 0 else 0
        else:
            weighted_admin_score = 0
        
        # الدرجة النهائية من 100
        final_score = (weighted_admin_score * 0.5) + (ai_score * 0.5)
        
        return {
            "admin_score": round(weighted_admin_score, 2),
            "ai_score": round(ai_score, 2),
            "final_score": round(final_score, 2),
            "max_possible": 50
        }


# إنشاء نسخة من الخدمة
ai_evaluation_service = AIEvaluationService()
