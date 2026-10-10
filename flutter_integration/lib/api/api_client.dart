import 'dart:convert';
import 'package:http/http.dart' as http;

/// Token storage contract (compatible with flutter_secure_storage)
abstract class SecureTokenStorage {
  Future<void> saveTokens({required String accessToken, required String refreshToken});
  Future<String?> getAccessToken();
  Future<String?> getRefreshToken();
  Future<void> clearTokens();
}

/// In-memory & preference fallback storage
class InMemoryTokenStorage implements SecureTokenStorage {
  String? _accessToken;
  String? _refreshToken;

  @override
  Future<void> saveTokens({required String accessToken, required String refreshToken}) async {
    _accessToken = accessToken;
    _refreshToken = refreshToken;
  }

  @override
  Future<String?> getAccessToken() async => _accessToken;

  @override
  Future<String?> getRefreshToken() async => _refreshToken;

  @override
  Future<void> clearTokens() async {
    _accessToken = null;
    _refreshToken = null;
  }
}

class ApiException implements Exception {
  final int statusCode;
  final String message;
  final String? code;

  ApiException({required this.statusCode, required this.message, this.code});

  @override
  String toString() => 'ApiException [$statusCode]: $message';
}

/// NeuroRehab Connect Shared API Client
class NeuroRehabApiClient {
  final String baseUrl;
  final SecureTokenStorage tokenStorage;
  final http.Client _client = http.Client();
  bool _isRefreshing = false;

  NeuroRehabApiClient({
    required this.baseUrl,
    SecureTokenStorage? tokenStorage,
  }) : tokenStorage = tokenStorage ?? InMemoryTokenStorage();

  Future<Map<String, String>> _headers({bool requiresAuth = true}) async {
    final headers = <String, String>{
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (requiresAuth) {
      final token = await tokenStorage.getAccessToken();
      if (token != null) {
        headers['Authorization'] = 'Bearer $token';
      }
    }
    return headers;
  }

  Future<dynamic> get(String path, {bool requiresAuth = true}) async {
    return _sendRequest(() async {
      final headers = await _headers(requiresAuth: requiresAuth);
      return _client.get(Uri.parse('$baseUrl$path'), headers: headers);
    }, path: path, requiresAuth: requiresAuth);
  }

  Future<dynamic> post(String path, dynamic body, {bool requiresAuth = true}) async {
    return _sendRequest(() async {
      final headers = await _headers(requiresAuth: requiresAuth);
      return _client.post(
        Uri.parse('$baseUrl$path'),
        headers: headers,
        body: jsonEncode(body),
      );
    }, path: path, requiresAuth: requiresAuth);
  }

  Future<dynamic> patch(String path, dynamic body, {bool requiresAuth = true}) async {
    return _sendRequest(() async {
      final headers = await _headers(requiresAuth: requiresAuth);
      return _client.patch(
        Uri.parse('$baseUrl$path'),
        headers: headers,
        body: jsonEncode(body),
      );
    }, path: path, requiresAuth: requiresAuth);
  }

  Future<dynamic> _sendRequest(
    Future<http.Response> Function() requestFn, {
    required String path,
    required bool requiresAuth,
  }) async {
    var response = await requestFn();

    // Auto-refresh token if expired
    if (response.statusCode == 401 && requiresAuth && !_isRefreshing) {
      final refreshed = await _attemptTokenRefresh();
      if (refreshed) {
        // Retry original request once with new token
        response = await requestFn();
      }
    }

    if (response.statusCode >= 200 && response.statusCode < 300) {
      if (response.body.isEmpty) return null;
      return jsonDecode(response.body);
    }

    // Parse structured server error
    String message = 'Server request failed';
    String? code;
    try {
      final errJson = jsonDecode(response.body);
      message = errJson['message'] ?? errJson['error'] ?? message;
      code = errJson['code'];
    } catch (_) {
      message = response.body.isNotEmpty ? response.body : response.reasonPhrase ?? message;
    }

    throw ApiException(
      statusCode: response.statusCode,
      message: message,
      code: code,
    );
  }

  Future<bool> _attemptTokenRefresh() async {
    _isRefreshing = true;
    try {
      final refreshToken = await tokenStorage.getRefreshToken();
      if (refreshToken == null) return false;

      final res = await _client.post(
        Uri.parse('$baseUrl/api/v1/auth/refresh'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'refreshToken': refreshToken}),
      );

      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        final tokens = data['tokens'];
        await tokenStorage.saveTokens(
          accessToken: tokens['accessToken'],
          refreshToken: tokens['refreshToken'],
        );
        return true;
      } else {
        // Refresh token invalid or revoked
        await tokenStorage.clearTokens();
        return false;
      }
    } catch (_) {
      return false;
    } finally {
      _isRefreshing = false;
    }
  }
}
