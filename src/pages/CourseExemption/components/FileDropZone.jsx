
import React, { useState, useRef, useCallback } from 'react';
import { C as PC } from '../../../constants/theme';
import { ICONS, SvgIcon } from '../../../components/ui/Icons';

const FileDropZone = ({ label, accept, onFile, fileName, loading }) => {
    const [dragOver, setDragOver] = useState(false);
    const inputRef = useRef(null);

    const handleDrop = useCallback(function (e) {
        e.preventDefault();
        setDragOver(false);
        var files = e.dataTransfer.files;
        if (files.length > 0) onFile(files[0]);
    }, [onFile]);

    const handleDragOver = useCallback(function (e) {
        e.preventDefault();
        setDragOver(true);
    }, []);

    const handleDragLeave = useCallback(function () {
        setDragOver(false);
    }, []);

    return (
        <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={function () { inputRef.current && inputRef.current.click(); }}
            style={{
                border: "2px dashed " + (dragOver ? PC.navy : (fileName ? "#10B981" : PC.border)),
                borderRadius: 12,
                padding: 24,
                textAlign: "center",
                cursor: "pointer",
                background: dragOver ? PC.blueLight : (fileName ? "#D1FAE5" : PC.bg),
                transition: "all 0.2s",
                minHeight: 100,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
            }}
        >
            <input
                ref={inputRef}
                type="file"
                accept={accept || ".pdf,.docx,.doc,.xlsx,.xls,.csv"}
                style={{ display: "none" }}
                onChange={function (e) { if (e.target.files[0]) onFile(e.target.files[0]); }}
            />
            {loading ? (
                <div style={{ color: PC.navy, fontWeight: 600 }}>Dosya okunuyor...</div>
            ) : fileName ? (
                <>
                    <SvgIcon path={ICONS.file} size={24} color="#10B981" />
                    <div style={{ fontWeight: 600, color: "#10B981" }}>{fileName}</div>
                    <div style={{ fontSize: 12, color: PC.textMuted }}>Tekrar yüklemek için tıklayın</div>
                </>
            ) : (
                <>
                    <SvgIcon path={ICONS.upload} size={32} color={PC.textMuted} />
                    <div style={{ fontWeight: 600, color: PC.navy }}>{label}</div>
                    <div style={{ fontSize: 12, color: PC.textMuted }}>PDF, Word veya Excel dosyası sürükleyin veya tıklayın</div>
                </>
            )}
        </div>
    );
};

export default FileDropZone;
