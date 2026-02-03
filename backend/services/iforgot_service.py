class iForgotService:
    BASE_URL = "https://iforgot.ibtikar.tr/api"

    @staticmethod
    def get_by_membership_number(membership_number: str):
        import requests

        url = f"{iForgotService.BASE_URL}/member/{membership_number}"
        response = requests.get(url, headers={"Content-Type": "application/json"})

        if response.status_code != 200:
            raise Exception("Failed to fetch member data")

        return response.json()