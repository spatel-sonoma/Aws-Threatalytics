import json
import unittest
from lambda_functions.analyze import lambda_handler

class TestAnalyze(unittest.TestCase):
    def test_lambda_handler(self):
        event = {
            'body': json.dumps({'text': 'Test input'}),
            'headers': {'x-api-key': 'test-key'}
        }
        context = {}
        response = lambda_handler(event, context)
        self.assertEqual(response['statusCode'], 200)
        # Add more assertions

if __name__ == '__main__':
    unittest.main()