from pydantic import BaseModel, ConfigDict, Field


class TTSRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    text: str = Field(min_length=1, max_length=2000)