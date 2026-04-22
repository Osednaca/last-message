from pydantic import BaseModel


class AnalyzeRequest(BaseModel):
    image: str  # base64-encoded image


class AnalyzeResponse(BaseModel):
    label: str
    category: str  # one of: water, air, fauna, consumption, energy


class AnalyzeErrorResponse(BaseModel):
    error: str
    detail: str


class LegacyGenerateRequest(BaseModel):
    text: str


class LegacyGenerateResponse(BaseModel):
    audio_base64: str


class LegacyCloneResponse(BaseModel):
    audio_base64: str


class LegacyErrorResponse(BaseModel):
    error: str
