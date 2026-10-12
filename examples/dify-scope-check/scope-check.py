import os
from urllib.request import Request, urlopen
from urllib.error import HTTPError

base = os.environ['DIFY_BASE_URL'].rstrip('/')
key = os.environ['DIFY_DATASET_KEY']
paths = [
  f"/datasets/{os.environ['DIFY_ALLOWED_ID']}/documents",
  f"/datasets/{os.environ['DIFY_OTHER_ID']}/documents",
  '/datasets',
]
for path in paths:
    req = Request(base + path,
      headers={'Authorization': 'Bearer ' + key},
      method='GET')
    try:
        with urlopen(req, timeout=15) as response:
            status = response.status
    except HTTPError as error:
        status = error.code
    print(path, status)
