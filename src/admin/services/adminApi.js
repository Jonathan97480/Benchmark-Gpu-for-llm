const ACCESS_TOKEN_KEY = "access_token";

function getStoredAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

function setStoredAccessToken(token) {
  if (token) {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
    return;
  }

  localStorage.removeItem(ACCESS_TOKEN_KEY);
}

async function readResponseBody(response, fallbackMessage) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const data = await response.json();
    return {
      data,
      message: data.error || fallbackMessage,
    };
  }

  const text = await response.text();
  return {
    data: null,
    message: text || fallbackMessage,
  };
}

async function refreshAccessToken() {
  const response = await fetch("/api/v1/auth/refresh", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    setStoredAccessToken(null);
    const { message } = await readResponseBody(response, "Session expired");
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  const { data } = await readResponseBody(response, "Failed to refresh session");
  setStoredAccessToken(data.access_token);
  return data.access_token;
}

async function apiRequest(path, options = {}) {
  const {
    auth = false,
    retry = true,
    body,
    headers = {},
    method = "GET",
  } = options;

  const requestHeaders = { ...headers };
  let token = getStoredAccessToken();

  if (auth && token) {
    requestHeaders.Authorization = `Bearer ${token}`;
  }

  if (body !== undefined && !requestHeaders["Content-Type"]) {
    requestHeaders["Content-Type"] = "application/json";
  }

  const response = await fetch(path, {
    method,
    credentials: "include",
    headers: requestHeaders,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (auth && response.status === 401 && retry) {
    token = await refreshAccessToken();
    return apiRequest(path, {
      ...options,
      retry: false,
      headers: {
        ...headers,
        Authorization: `Bearer ${token}`,
      },
    });
  }

  if (!response.ok) {
    const { message } = await readResponseBody(response, "Request failed");
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return null;
  }

  const { data } = await readResponseBody(response, "Request failed");
  return data;
}

async function downloadRequest(path, { auth = false, headers = {}, retry = true } = {}) {
  let token = getStoredAccessToken();

  if (auth && token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(path, {
    method: "GET",
    credentials: "include",
    headers,
  });

  if (!response.ok) {
    if (auth && response.status === 401 && retry) {
      token = await refreshAccessToken();
      return downloadRequest(path, {
        auth,
        headers: {
          Authorization: `Bearer ${token}`,
        },
        retry: false,
      });
    }

    const { message } = await readResponseBody(response, "Download failed");
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return response.blob();
}

export function clearAdminSession() {
  setStoredAccessToken(null);
}

export function getAdminAccessToken() {
  return getStoredAccessToken();
}

export async function fetchAdminExists() {
  return apiRequest("/api/v1/auth/admin-exists", { retry: false });
}

export async function loginAdmin(credentials) {
  const data = await apiRequest("/api/v1/auth/login", {
    method: "POST",
    body: credentials,
    retry: false,
  });

  setStoredAccessToken(data.access_token);
  return data;
}

export async function registerAdmin(payload) {
  return apiRequest("/api/v1/auth/register", {
    method: "POST",
    body: payload,
    retry: false,
  });
}

export async function logoutAdmin() {
  try {
    await apiRequest("/api/v1/auth/logout", {
      method: "POST",
      body: {},
      retry: false,
    });
  } finally {
    clearAdminSession();
  }
}

export async function fetchApiKeys() {
  return apiRequest("/api/v1/auth/api-keys", { auth: true });
}

export async function createApiKey(payload) {
  return apiRequest("/api/v1/auth/api-keys", {
    method: "POST",
    body: payload,
    auth: true,
  });
}

export async function revokeApiKey(id) {
  return apiRequest(`/api/v1/auth/api-keys/${id}`, {
    method: "DELETE",
    auth: true,
  });
}

export async function restoreAdminSession() {
  if (getStoredAccessToken()) {
    return getStoredAccessToken();
  }

  const token = await refreshAccessToken();
  return token;
}

export async function fetchGpuList() {
  return apiRequest("/api/v1/gpu", { auth: true });
}

export async function fetchGpuById(id) {
  return apiRequest(`/api/v1/gpu/${id}`, { auth: true });
}

export async function createGpu(payload) {
  return apiRequest("/api/v1/gpu", {
    method: "POST",
    body: payload,
    auth: true,
  });
}

export async function updateGpu(id, payload) {
  return apiRequest(`/api/v1/gpu/${id}`, {
    method: "PUT",
    body: payload,
    auth: true,
  });
}

export async function deleteGpu(id) {
  return apiRequest(`/api/v1/gpu/${id}`, {
    method: "DELETE",
    auth: true,
  });
}

export async function fetchModels() {
  return apiRequest("/api/v1/models", { auth: true });
}

export async function createModel(payload) {
  return apiRequest("/api/v1/models", {
    method: "POST",
    body: payload,
    auth: true,
  });
}

export async function updateModel(id, payload) {
  return apiRequest(`/api/v1/models/${id}`, {
    method: "PUT",
    body: payload,
    auth: true,
  });
}

export async function deleteModel(id) {
  return apiRequest(`/api/v1/models/${id}`, {
    method: "DELETE",
    auth: true,
  });
}

export async function recomputeModelAnalyticalProfile(id) {
  return apiRequest(`/api/v1/models/${id}/recompute-analytical-profile`, {
    method: "POST",
    body: {},
    auth: true,
  });
}

export async function createBenchmark(gpuId, payload) {
  return apiRequest(`/api/v1/gpu/${gpuId}/benchmark`, {
    method: "POST",
    body: payload,
    auth: true,
  });
}

export async function updateBenchmark(gpuId, benchmarkId, payload) {
  return apiRequest(`/api/v1/gpu/${gpuId}/benchmark/${benchmarkId}`, {
    method: "PUT",
    body: payload,
    auth: true,
  });
}

export async function deleteBenchmark(gpuId, benchmarkId) {
  return apiRequest(`/api/v1/gpu/${gpuId}/benchmark/${benchmarkId}`, {
    method: "DELETE",
    auth: true,
  });
}

export async function fetchBackups() {
  return apiRequest("/api/v1/backups", { auth: true });
}

export async function createBackup(payload = {}) {
  return apiRequest("/api/v1/backups", {
    method: "POST",
    body: payload,
    auth: true,
  });
}

export async function downloadBackup(fileName) {
  const blob = await downloadRequest(`/api/v1/backups/${encodeURIComponent(fileName)}/download`, {
    auth: true,
  });

  return {
    blob,
    fileName,
  };
}
