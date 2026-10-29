import { useEffect, useState } from 'react';
import { fetchBlob, openProtected } from '../utils/files';

export default function ProtectedFile({ id, name, mime }) {
  const [src, setSrc] = useState('');
  const isImg = Boolean(mime) && mime.startsWith('image/');

  useEffect(() => {
    if (!isImg) return undefined;
    let url = '';
    let off = false;
    fetchBlob(`/files/${id}`)
      .then((b) => {
        if (off) return;
        url = URL.createObjectURL(b);
        setSrc(url);
      })
      .catch(() => {});
    return () => {
      off = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [id, isImg]);

  if (isImg)
    return src ? (
      <a href={src} target="_blank" rel="noreferrer"><img className="mc-chat-img" src={src} alt={name} /></a>
    ) : (
      <span className="small">Loading image...</span>
    );

  return (
    <button type="button" className="btn btn-mc-outline btn-mc-sm" onClick={() => openProtected(`/files/${id}`)}>
      📄 {name}
    </button>
  );
}