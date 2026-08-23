import React, { useEffect, useState, useRef } from 'react';
import { useDocumentStore } from '../../store/documentStore';
import { useAuthStore } from '../../store/authStore';
import { useRoomStore } from '../../store/roomStore';
import { Upload, File, FileText, Image as ImageIcon, Download, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
  }, [channelId, fetchDocuments]);

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
    if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext)) return <ImageIcon className="w-10 h-10 text-blue-400 drop-shadow-sm" />;
    if (['pdf', 'doc', 'docx', 'txt'].includes(ext)) return <FileText className="w-10 h-10 text-red-400 drop-shadow-sm" />;
    return <File className="w-10 h-10 text-gray-400 drop-shadow-sm" />;
  };

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="flex-1 flex flex-col bg-transparent overflow-hidden">
      {/* Header */}
      <div className="h-14 flex items-center justify-between px-6 border-b border-white/10 shrink-0 bg-white/5 backdrop-blur-sm">
        <h2 className="font-bold text-white flex items-center gap-2 uppercase tracking-wide text-sm drop-shadow-sm">
          <File className="w-5 h-5 text-indigo-400" />
          Tài Liệu Chung
        </h2>
        <span className="text-xs font-semibold text-white/50 bg-white/10 px-2.5 py-1 rounded-full">
          {documents.length} tập tin
        </span>
      </div>

      {/* Upload Area */}
      <div className="p-6 shrink-0">
        <div 
          className={`relative border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center transition-all duration-300 ${
            dragActive 
              ? 'border-indigo-400 bg-indigo-500/20 shadow-[0_0_30px_rgba(99,102,241,0.2)] scale-[1.02]' 
              : 'border-white/20 bg-white/5 hover:bg-white/10 hover:border-white/30 hover:shadow-lg'
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
          <motion.div 
            whileHover={{ scale: 1.1, rotate: 5 }}
            className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-colors ${dragActive ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/50' : 'bg-indigo-500/20 text-indigo-300'}`}
          >
            <Upload className="w-8 h-8" />
          </motion.div>
          <p className="text-white font-bold mb-2 drop-shadow-sm text-center">
            Kéo thả tài liệu vào đây hoặc{' '}
            <button 
              onClick={() => fileInputRef.current?.click()} 
              className="text-indigo-400 hover:text-indigo-300 underline decoration-indigo-400/30 hover:decoration-indigo-400 underline-offset-4 transition-all"
            >
              tải lên từ máy
            </button>
          </p>
          <p className="text-white/50 text-xs font-medium bg-black/20 px-3 py-1 rounded-full border border-white/5">
            Hỗ trợ PDF, Word, Ảnh... Tối đa 20MB.
          </p>
          
          <AnimatePresence>
            {uploading && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center z-10 border border-white/10"
              >
                <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-3"></div>
                <p className="text-sm font-bold text-indigo-300 drop-shadow-sm animate-pulse">Đang tải lên...</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Document Grid */}
      <div className="flex-1 overflow-y-auto px-6 pb-6 custom-scrollbar">
        {isLoading && !documents.length ? (
          <div className="flex justify-center p-12">
            <div className="w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
          </div>
        ) : documents.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center h-48 text-white/30"
          >
            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-4 border border-white/10">
              <FileText className="w-10 h-10 opacity-50" />
            </div>
            <p className="font-medium text-sm">Chưa có tài liệu nào trong kênh này.</p>
          </motion.div>
        ) : (
          <motion.div 
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
            initial="hidden"
            animate="show"
            variants={{
              hidden: { opacity: 0 },
              show: {
                opacity: 1,
                transition: { staggerChildren: 0.05 }
              }
            }}
          >
            <AnimatePresence mode="popLayout">
              {documents.map((doc) => {
                const isOwner = currentRoom?.members?.find(m => m.id === user?.id)?.role === 'owner';
                const canDelete = doc.uploader_id === user?.id || isOwner;
                const downloadUrl = import.meta.env.VITE_API_URL.replace('/api', '') + doc.file_url;

                return (
                  <motion.div 
                    key={doc.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ type: "spring", bounce: 0.3 }}
                    className="group glass-panel hover:bg-white/10 rounded-2xl p-5 flex flex-col transition-all relative border border-white/10 shadow-lg hover:shadow-xl hover:border-white/20 hover:-translate-y-1"
                  >
                    {canDelete && (
                      <button 
                        onClick={() => {
                          if (window.confirm('Bạn có chắc muốn xoá tài liệu này?')) deleteDocument(doc.id);
                        }}
                        className="absolute top-3 right-3 p-1.5 bg-red-500/20 text-red-300 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white hover:scale-110 shadow-sm"
                        title="Xoá file"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    
                    <div className="flex-1 flex flex-col items-center justify-center py-4 relative">
                      <motion.div whileHover={{ rotate: [-5, 5, -5, 0], transition: { duration: 0.3 } }}>
                        {getFileIcon(doc.file_name)}
                      </motion.div>
                      <span className="mt-4 text-sm font-bold text-white text-center line-clamp-2 leading-snug drop-shadow-sm" title={doc.file_name}>
                        {doc.file_name}
                      </span>
                    </div>
                    
                    <div className="mt-2 pt-4 border-t border-white/10 flex items-center justify-between">
                      <div className="flex items-center gap-2 overflow-hidden bg-black/20 pr-3 rounded-full border border-white/5">
                        {doc.avatar_url ? (
                          <img src={doc.avatar_url} className="w-7 h-7 rounded-full object-cover shrink-0 border border-white/10" alt="avatar" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-white/20 shrink-0 border border-white/10"></div>
                        )}
                        <div className="flex flex-col text-[10px] text-white/50 truncate py-0.5">
                          <span className="truncate font-bold text-white/70">{doc.display_name || doc.username}</span>
                          <span className="font-medium">{formatSize(doc.file_size)}</span>
                        </div>
                      </div>
                      <motion.a 
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        href={downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 bg-indigo-500/20 text-indigo-300 rounded-xl hover:bg-indigo-500 hover:text-white transition-colors shadow-sm"
                        download={doc.file_name}
                        title="Tải xuống"
                      >
                        <Download className="w-4 h-4" />
                      </motion.a>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
}
