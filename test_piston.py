import httpx
import asyncio

async def test():
    payload = {
        "language": "python",
        "version": "3.10.0",
        "files": [{"name": "main.py", "content": "print('hello')"}],
    }
    async with httpx.AsyncClient() as c:
        resp = await c.post("https://emkc.org/api/v2/piston/execute", json=payload)
        print(resp.json())

asyncio.run(test())
