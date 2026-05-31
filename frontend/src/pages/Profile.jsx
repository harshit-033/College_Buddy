import { useState, useEffect } from "react"
import { User, Mail, Phone, MapPin, University, BookOpen, GraduationCap, Building2, Save, Camera, Smartphone, School, Hash, Layers, Layout, Landmark } from "lucide-react"
import API, { API_BASE } from "../api/api"
import { getToken, getUserRole } from "../utils/auth"
import { resolveUploadUrl } from "../utils/url"
import Sidebar from "../components/Sidebar"
import StudentSidebar from "../components/StudentSidebar"
import { toast } from "react-hot-toast"

function Profile() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [role] = useState(getUserRole())
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    profile_photo: "",
    student_type: "college", // school / college
    institution_name: "",
    board: "",
    grade: "",
    semester: "",
    course: "",
    department: "",
    section: "",
    roll_number: "",
    org_name: "",
    org_address: ""
  })
  
  const [preview, setPreview] = useState(null)
  const [photoFile, setPhotoFile] = useState(null)

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const token = getToken()
      const res = await API.get("/user/profile", {
        headers: { Authorization: `Bearer ${token}` }
      })
      setProfile(res.data)
      if (res.data.profile_photo) {
        setPreview(resolveUploadUrl(res.data.profile_photo))
      }
    } catch (err) {
      console.error("Error fetching profile:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setProfile(prev => ({ ...prev, [name]: value }))
  }

  const handlePhotoChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setPhotoFile(file)
      setPreview(URL.createObjectURL(file))
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    
    try {
      const token = getToken()
      const formData = new FormData()
      
      // Basic Info
      formData.append("name", profile.name)
      formData.append("phone", profile.phone || "")
      formData.append("address", profile.address || "")
      
      if (role === "student") {
        formData.append("student_type", profile.student_type)
        formData.append("institution_name", profile.institution_name || "")
        formData.append("section", profile.section || "")
        formData.append("roll_number", profile.roll_number || "")
        
        if (profile.student_type === "school") {
          formData.append("board", profile.board || "")
          formData.append("grade", profile.grade || "")
        } else {
          formData.append("course", profile.course || "")
          formData.append("department", profile.department || "")
          formData.append("semester", profile.semester || "")
        }
      } else if (role === "host") {
        formData.append("org_name", profile.org_name || "")
        formData.append("org_address", profile.org_address || "")
      }
      
      if (photoFile) {
        formData.append("profile_photo", photoFile)
      }

      await API.put("/user/profile", formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data" 
        }
      })
      
      toast.success("Profile updated successfully!")
    } catch (err) {
      console.error("Error updating profile:", err)
      toast.error("Failed to update profile")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        {role === "host" ? <Sidebar /> : <StudentSidebar />}
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse flex flex-col items-center">
            <div className="w-12 h-12 bg-blue-200 rounded-full mb-4"></div>
            <div className="h-4 w-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {role === "host" ? <Sidebar /> : <StudentSidebar />}

      <div className="flex-1 p-8 animate-fade-in">
        <div className="max-w-4xl mx-auto">
          <header className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800">My Account</h1>
            <p className="text-gray-500 mt-1">Manage your personal and institutional information</p>
          </header>

          <form onSubmit={handleSave} className="space-y-6">
            {/* Profile Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-700 relative">
                <div className="absolute -bottom-12 left-8">
                  <div className="relative group">
                    <div className="w-24 h-24 rounded-2xl border-4 border-white bg-white overflow-hidden shadow-md">
                      {preview ? (
                        <img src={preview} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-blue-50 flex items-center justify-center text-blue-300">
                          <User size={40} />
                        </div>
                      )}
                    </div>
                    <label className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-2xl">
                      <Camera size={20} />
                      <input type="file" className="hidden" onChange={handlePhotoChange} accept="image/*" />
                    </label>
                  </div>
                </div>
              </div>
              <div className="pt-16 pb-8 px-8">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">{profile.name}</h2>
                    <p className="text-blue-600 font-medium capitalize">{role}</p>
                  </div>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl font-semibold transition-all shadow-lg shadow-blue-200 disabled:opacity-50"
                  >
                    {saving ? "Saving..." : <><Save size={18} /> Save Changes</>}
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Personal Details */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-2">
                  <User size={18} className="text-blue-500" /> Personal Details
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 text-gray-400" size={18} />
                      <input
                        name="name"
                        value={profile.name}
                        onChange={handleInputChange}
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none text-gray-700"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Email (Registered)</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 text-gray-400" size={18} />
                      <input
                        value={profile.email}
                        readOnly
                        className="w-full pl-10 pr-4 py-2 bg-gray-100 border border-gray-200 rounded-xl text-gray-500 cursor-not-allowed outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Phone Number</label>
                    <div className="relative">
                      <Smartphone className="absolute left-3 top-2.5 text-gray-400" size={18} />
                      <input
                        name="phone"
                        value={profile.phone || ""}
                        onChange={handleInputChange}
                        placeholder="e.g. +91 9876543210"
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none text-gray-700"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">Address</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-2.5 text-gray-400" size={18} />
                      <textarea
                        name="address"
                        value={profile.address || ""}
                        onChange={handleInputChange}
                        rows={2}
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none text-gray-700 resize-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Role Specific Details */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4">
                {role === "student" ? (
                  <>
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <GraduationCap size={18} className="text-blue-500" /> Academic Details
                      </h3>
                      <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button
                          type="button"
                          onClick={() => setProfile(p => ({ ...p, student_type: "college" }))}
                          className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${profile.student_type === "college" ? "bg-white shadow-sm text-blue-600" : "text-gray-500"}`}
                        >
                          College
                        </button>
                        <button
                          type="button"
                          onClick={() => setProfile(p => ({ ...p, student_type: "school" }))}
                          className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${profile.student_type === "school" ? "bg-white shadow-sm text-blue-600" : "text-gray-500"}`}
                        >
                          School
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">
                          {profile.student_type === "college" ? "College Name" : "School Name"}
                        </label>
                        <div className="relative">
                          {profile.student_type === "college" ? (
                            <Landmark className="absolute left-3 top-2.5 text-gray-400" size={18} />
                          ) : (
                            <School className="absolute left-3 top-2.5 text-gray-400" size={18} />
                          )}
                          <input
                            name="institution_name"
                            value={profile.institution_name || ""}
                            onChange={handleInputChange}
                            placeholder={profile.student_type === "college" ? "University / College" : "High School Name"}
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none text-gray-700"
                          />
                        </div>
                      </div>

                      {profile.student_type === "college" ? (
                        <>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-500 mb-1">Course</label>
                              <div className="relative">
                                <BookOpen className="absolute left-3 top-2.5 text-gray-400" size={18} />
                                <input
                                  name="course"
                                  value={profile.course || ""}
                                  onChange={handleInputChange}
                                  placeholder="e.g. B.Tech"
                                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none text-gray-700"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-500 mb-1">Semester</label>
                              <div className="relative">
                                <Layers className="absolute left-3 top-2.5 text-gray-400" size={18} />
                                <input
                                  name="semester"
                                  value={profile.semester || ""}
                                  onChange={handleInputChange}
                                  placeholder="e.g. 6th"
                                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none text-gray-700"
                                />
                              </div>
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-500 mb-1">Department</label>
                            <div className="relative">
                              <Layout className="absolute left-3 top-2.5 text-gray-400" size={18} />
                              <input
                                name="department"
                                value={profile.department || ""}
                                onChange={handleInputChange}
                                placeholder="e.g. Computer Science"
                                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none text-gray-700"
                              />
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-500 mb-1">Board</label>
                              <div className="relative">
                                <Landmark className="absolute left-3 top-2.5 text-gray-400" size={18} />
                                <input
                                  name="board"
                                  value={profile.board || ""}
                                  onChange={handleInputChange}
                                  placeholder="e.g. CBSE / ICSE"
                                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none text-gray-700"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-500 mb-1">Class</label>
                              <div className="relative">
                                <Layers className="absolute left-3 top-2.5 text-gray-400" size={18} />
                                <input
                                  name="grade"
                                  value={profile.grade || ""}
                                  onChange={handleInputChange}
                                  placeholder="e.g. 12th"
                                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none text-gray-700"
                                />
                              </div>
                            </div>
                          </div>
                        </>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-500 mb-1">Section</label>
                          <div className="relative">
                            <Layout className="absolute left-3 top-2.5 text-gray-400" size={18} />
                            <input
                              name="section"
                              value={profile.section || ""}
                              onChange={handleInputChange}
                              placeholder="e.g. A"
                              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none text-gray-700"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-500 mb-1">Roll Number</label>
                          <div className="relative">
                            <Hash className="absolute left-3 top-2.5 text-gray-400" size={18} />
                            <input
                              name="roll_number"
                              value={profile.roll_number || ""}
                              onChange={handleInputChange}
                              placeholder="e.g. 101"
                              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none text-gray-700"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-2">
                      <Building2 size={18} className="text-blue-500" /> Organization Details
                    </h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">Organization Name</label>
                        <div className="relative">
                          <Building2 className="absolute left-3 top-2.5 text-gray-400" size={18} />
                          <input
                            name="org_name"
                            value={profile.org_name || ""}
                            onChange={handleInputChange}
                            placeholder="e.g. Tech Solutions Inc."
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none text-gray-700"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">Organization Address</label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-2.5 text-gray-400" size={18} />
                          <textarea
                            name="org_address"
                            value={profile.org_address || ""}
                            onChange={handleInputChange}
                            rows={3}
                            placeholder="Full office address..."
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none text-gray-700 resize-none"
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Profile
