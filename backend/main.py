from fastapi import FastAPI, HTTPException, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
import os
from passlib.context import CryptContext
import jwt

app = FastAPI()

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

origins = [
    "http://127.0.0.1:8000",
    # Your actual live Vercel domain
]

load_dotenv()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def create_access_token(data: dict):
    encoded_jwt = jwt.encode(data, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def verify_access_token(token: str):
    try:
        # Decode the token using your secret key and algorithm
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

        # Extract the user ID (or whatever data you packed into "sub")
        user_id: str = payload.get("id")

        if user_id is None:
            raise HTTPException(
                status_code=401, detail="Failed to validate credentials."
            )

        return user_id

    except jwt.PyJWTError:
        # Triggers if the token is tampered with, fake, or invalid
        raise HTTPException(status_code=401, detail="Failed to validate credentials.")


def hash_password(plain_password: str) -> str:
    return pwd_context.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


@app.get("/api/render-home")
def render_home(request: Request, authorization: str = Header(None)):
    # Check if the Authorization header is present
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header missing")

    # Extract the token from the Authorization header
    token = authorization.split(" ")[1]  # Assuming the format is "Bearer <token>"
    user_id = verify_access_token(token)

    # Validate the token (you can implement your own validation logic)
    if not user_id:
        raise HTTPException(status_code=403, detail="Invalid token")

    # If the token is valid, return the home page content
    return {"message": "Home page content goes here"}
