import { create } from 'zustand';
import { fetchApi } from '../lib/api';

export const useDocumentStore = create((set, get) => ({
  documents: [],
  isLoading: false,

  fetchDocuments: async (channelId) => {
    set({ isLoading: true });
    try {
      const data = await fetchApi(`/documents/${channelId}`);
      set({ documents: data.documents, isLoading: false });
    } catch (error) {
      console.error('Lỗi fetchDocuments:', error);
      set({ isLoading: false });
    }
  },

  uploadDocument: async (channelId, file) => {
    set({ isLoading: true });
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/documents/${channelId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Lỗi tải lên');

      // Add to store immediately
      set((state) => ({ 
        documents: [data.document, ...state.documents],
        isLoading: false
      }));
      
      return true;
    } catch (error) {
      console.error('Lỗi uploadDocument:', error);
      set({ isLoading: false });
      return false;
    }
  },

  deleteDocument: async (id) => {
    try {
      await fetchApi(`/documents/${id}`, { method: 'DELETE' });
      set((state) => ({
        documents: state.documents.filter(d => d.id !== id)
      }));
      return true;
    } catch (error) {
      console.error('Lỗi deleteDocument:', error);
      return false;
    }
  }
}));
