const API_URL = 'http://localhost:5000/api';

export const fetchApi = async (endpoint, options = {}) => {
  const token = localStorage.getItem('studybox_token');
  const headers = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  // Chỉ set Content-Type JSON nếu body KHÔNG phải là FormData
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Đã có lỗi xảy ra');
  }

  return data;
};
