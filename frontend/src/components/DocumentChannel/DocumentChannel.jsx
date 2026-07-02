import React, { useEffect, useState, useRef } from 'react';
import { useDocumentStore } from '../../store/documentStore';
import { useAuthStore } from '../../store/authStore';
import { useRoomStore } from '../../store/roomStore';
import { Upload, File, FileText, Image as ImageIcon, Download, Trash2, X } from 'lucide-react';
import { format } from 'date-fns';

export default function DocumentChannel({ channelId, roomId }) {
  const { documents, isLoading, fetchDocuments, uploadDocument, deleteDocument } = useDocumentStore();
  const { user } = useAuthStore();
  const { currentRoom } = useRoomStore();
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (channelId) {
      fetchDocuments(channelId);
    }
  }, [channelId]);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUpload(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleUpload(e.target.files[0]);
    }
  };

  const handleUpload = async (file) => {
    if (file.size > 20 * 1024 * 1024) {
      alert('File vượt quá giới hạn 20MB');
      return;
    }
    setUploading(true);
    await uploadDocument(channelId, file);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getFileIcon = (fileName) => {
    const ext = fileName.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'svg'].includes(ext)) return <ImageIcon className="w-10 h-10 text-blue-400" />;
    if (['pdf', 'doc', 'docx', 'txt'].includes(ext)) return <FileText className="w-10 h-10 text-red-400" />;
    return <File className="w-10 h-10 text-gray-400" />;
  };

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="flex-1 flex flex-col bg-white/5 overflow-hidden">
      {/* Header */}
      <div className="h-14 flex items-center justify-between px-6 border-b border-white/10 shrink-0">
        <h2 className="font-bold text-white flex items-center gap-2">
          <File className="w-5 h-5 text-indigo-400" />
          Kênh Tài Liệu
        </h2>
      </div>

      {/* Upload Area */}
      <div className="p-6">
        <div 
          className={`relative border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-all ${
            dragActive ? 'border-indigo-400 bg-indigo-500/10' : 'border-white/20 bg-white/5 hover:bg-white/10'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input 
            ref={fileInputRef}
            type="file" 
            className="hidden" 
            onChange={handleChange}
          />
          <div className="w-16 h-16 rounded-full bg-indigo-500/20 flex items-center justify-center mb-4 text-indigo-300">
            <Upload className="w-8 h-8" />
          </div>
          <p className="text-white font-semibold mb-1">
            Kéo thả tài liệu vào đây hoặc <button onClick={() => fileInputRef.current?.click()} className="text-indigo-400 hover:underline">Tải lên</button>
          </p>
          <p className="text-white/50 text-sm">Hỗ trợ PDF, Word, Ảnh... Tối đa 20MB.</p>
          
          {uploading && (
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
            </div>
          )}
        </div>
      </div>

      {/* Document Grid */}
      <div className="flex-1 overflow-y-auto px-6 pb-6 custom-scrollbar">
        {isLoading && !documents.length ? (
          <div className="flex justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
          </div>
        ) : documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-white/40">
            <FileText className="w-12 h-12 mb-3 opacity-50" />
            <p>Chưa có tài liệu nào trong kênh này.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {documents.map((doc) => {
              const isOwner = currentRoom?.members?.find(m => m.id === user.id)?.role === 'owner';
              const canDelete = doc.uploader_id === user.id || isOwner;
              const downloadUrl = import.meta.env.VITE_API_URL.replace('/api', '') + doc.file_url;

              return (
                <div key={doc.id} className="group bg-white/10 hover:bg-white/15 border border-white/5 rounded-xl p-4 flex flex-col transition-all relative">
                  {canDelete && (
                    <button 
                      onClick={() => {
                        if (window.confirm('Bạn có chắc muốn xoá tài liệu này?')) deleteDocument(doc.id);
                      }}
                      className="absolute top-2 right-2 p-1.5 bg-red-500/20 text-red-300 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 hover:text-white"
                      title="Xoá file"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  
                  <div className="flex-1 flex flex-col items-center justify-center py-4">
                    {getFileIcon(doc.file_name)}
                    <span className="mt-3 text-sm font-medium text-white text-center line-clamp-2" title={doc.file_name}>
                      {doc.file_name}
                    </span>
                  </div>
                  
                  <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-2 overflow-hidden">
                      {doc.avatar_url ? (
                        <img src={doc.avatar_url} className="w-5 h-5 rounded-full object-cover shrink-0" alt="avatar" />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-white/20 shrink-0"></div>
                      )}
                      <div className="flex flex-col text-[10px] text-white/50 truncate">
                        <span className="truncate">{doc.display_name || doc.username}</span>
                        <span>{formatSize(doc.file_size)}</span>
                      </div>
                    </div>
                    <a 
                      href={downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 bg-indigo-500/20 text-indigo-300 rounded-lg hover:bg-indigo-500 hover:text-white transition-colors"
                      download={doc.file_name}
                      title="Tải xuống"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
