import os
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv()

client = MongoClient(
    os.environ["MONGO_URI"],
    serverSelectionTimeoutMS=10000
)

print(client.admin.command("ping"))
print("MongoDB Atlas connection successful!")

client.close()