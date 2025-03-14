"use client";

import React from "react";

type LocalFontUploaderProps = {
  onUpload: (fontName: string) => void;
};

const LocalFontUploader: React.FC<LocalFontUploaderProps> = ({ onUpload }) => {
  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const { files } = event.target;
    if (files && files[0]) {
      const file = files[0];
      const fontName = file.name.split(".")[0];
      const fileUrl = URL.createObjectURL(file);
      try {
        const font = new FontFace(fontName, `url(${fileUrl})`);
        await font.load();
        document.fonts.add(font);
        onUpload(fontName);
      } catch (error) {
        console.error("Failed to load font:", error);
      }
    }
  };

  return (
    <div className="mt-4">
      <label className="block text-sm font-medium text-foreground mb-1">
        Upload Local Font
      </label>
      <input
        type="file"
        accept=".ttf,.otf,.woff,.woff2"
        onChange={handleFileChange}
      />
    </div>
  );
};

export default LocalFontUploader;
