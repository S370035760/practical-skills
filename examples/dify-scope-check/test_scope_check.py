"""Offline tests of the unchanged article snippet; no Dify or real credentials."""
import contextlib
import io
import os
from pathlib import Path
import runpy
import unittest
from unittest.mock import patch
from urllib.error import HTTPError, URLError

SCRIPT = Path(__file__).with_name('scope-check.py')
FIXTURE = {
    'DIFY_BASE_URL': 'https://example.invalid/v1',
    'DIFY_DATASET_KEY': 'dummy-offline-key-not-a-credential',
    'DIFY_ALLOWED_ID': 'allowed-demo',
    'DIFY_OTHER_ID': 'other-demo',
}


class FakeResponse:
    def __init__(self, status):
        self.status = status

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def read(self, *args):
        raise AssertionError('The status-only example must not read document bodies')


class ScopeCheckTests(unittest.TestCase):
    def run_example(self, statuses=(200, 403, 403), overrides=None, missing=None):
        environment = dict(FIXTURE)
        environment.update(overrides or {})
        if missing:
            environment.pop(missing)
        calls = []
        statuses = iter(statuses)
        output = io.StringIO()

        def fake_open(request, timeout):
            calls.append((request, timeout))
            status = next(statuses)
            if isinstance(status, Exception):
                raise status
            if status >= 400:
                error = HTTPError(request.full_url, status, 'offline fixture', None, None)
                error.close()  # No response body is needed by this status-only fixture.
                raise error
            return FakeResponse(status)

        # Clear inherited credentials and intercept urllib before run_path imports it.
        # A socket guard also rejects accidental network fall-through.
        with patch.dict(os.environ, environment, clear=True), \
                patch('urllib.request.urlopen', side_effect=fake_open), \
                patch('socket.create_connection', side_effect=AssertionError('Network forbidden')), \
                contextlib.redirect_stdout(output):
            try:
                runpy.run_path(str(SCRIPT), run_name='__main__')
            except Exception as error:
                return output.getvalue(), calls, error
        return output.getvalue(), calls, None

    def test_allowed_and_two_denied_statuses(self):
        output, calls, error = self.run_example()
        self.assertIsNone(error)
        self.assertEqual(len(calls), 3)
        self.assertEqual(output, '/datasets/allowed-demo/documents 200\n'
                                 '/datasets/other-demo/documents 403\n/datasets 403\n')

    def test_only_get_and_timeout_and_fake_header(self):
        _, calls, error = self.run_example()
        self.assertIsNone(error)
        for request, timeout in calls:
            self.assertEqual(request.get_method(), 'GET')
            self.assertEqual(timeout, 15)
            self.assertEqual(request.get_header('Authorization'), 'Bearer ' + FIXTURE['DIFY_DATASET_KEY'])

    def test_base_prefix_and_trailing_slash(self):
        _, calls, error = self.run_example(overrides={'DIFY_BASE_URL': 'https://example.invalid/v1///'})
        self.assertIsNone(error)
        self.assertEqual([request.full_url for request, _ in calls], [
            'https://example.invalid/v1/datasets/allowed-demo/documents',
            'https://example.invalid/v1/datasets/other-demo/documents',
            'https://example.invalid/v1/datasets'])

    def test_denied_target_success_is_not_hidden(self):
        output, _, error = self.run_example((200, 200, 200))
        self.assertIsNone(error)
        self.assertEqual(output.count(' 200\n'), 3)
        self.assertNotIn('PASS', output)

    def test_authentication_failure_not_converted_to_scope_denial(self):
        output, _, error = self.run_example((401, 401, 401))
        self.assertIsNone(error)
        self.assertEqual(output.count(' 401\n'), 3)
        self.assertNotIn('403', output)

    def test_missing_route_not_converted_to_scope_denial(self):
        output, _, error = self.run_example((404, 404, 404))
        self.assertIsNone(error)
        self.assertEqual(output.count(' 404\n'), 3)
        self.assertNotIn('403', output)

    def test_network_failure_propagates_and_stops(self):
        output, calls, error = self.run_example((200, URLError('offline timeout'), 403))
        self.assertIsInstance(error, URLError)
        self.assertEqual(len(calls), 2)
        self.assertEqual(output, '/datasets/allowed-demo/documents 200\n')

    def test_missing_configuration_makes_no_request(self):
        for name in FIXTURE:
            with self.subTest(variable=name):
                output, calls, error = self.run_example(missing=name)
                self.assertIsInstance(error, KeyError)
                self.assertEqual(calls, [])
                self.assertEqual(output, '')

    def test_no_response_body_is_read(self):
        _, _, error = self.run_example((200, 200, 200))
        self.assertIsNone(error)  # FakeResponse.read would fail if used.

    def test_stdout_omits_key_and_authorization(self):
        output, _, error = self.run_example()
        self.assertIsNone(error)
        self.assertNotIn(FIXTURE['DIFY_DATASET_KEY'], output)
        self.assertNotIn('Bearer', output)


if __name__ == '__main__':
    unittest.main(verbosity=2)
