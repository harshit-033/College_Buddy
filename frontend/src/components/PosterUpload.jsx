import { useDropzone } from "react-dropzone"
import { useState } from "react"
import { ImagePlus } from "lucide-react"

function PosterUpload({ setPoster }) {
  const [preview, setPreview] = useState(null)

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "image/*": [] },
    maxFiles: 1,
    onDrop: (files) => {
      if (files[0]) {
        setPoster(files[0])
        setPreview(URL.createObjectURL(files[0]))
      }
    }
  })

  return (
    <div
      {...getRootProps()}
      className={`border-dashed border-2 rounded-lg cursor-pointer transition-colors ${
        isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-blue-400"
      }`}
    >
      <input {...getInputProps()} />

      {preview ? (
        <div className="relative">
          <img src={preview} alt="Poster preview" className="w-full h-48 object-cover rounded-lg" />
          <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center rounded-lg opacity-0 hover:opacity-100 transition-opacity">
            <p className="text-white font-medium">Click to change</p>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center">
          <ImagePlus size={36} className="mx-auto mb-3 text-gray-400" />
          <p className="font-medium text-gray-600">Drag & Drop Event Poster</p>
          <p className="text-sm text-gray-400 mt-1">Click to upload · PNG, JPG, WEBP</p>
        </div>
      )}
    </div>
  )
}

export default PosterUpload
