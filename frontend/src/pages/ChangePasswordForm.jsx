import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";

const ChangePasswordForm = () => {
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showForm, setShowForm] = useState(false);
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const toggleVisibility = (field) => {
    setShowPassword((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axiosInstance.put("/auth/change-password", form); 
      toast.success(res.data.message);
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setShowForm(false);
    } catch (error) {
      console.error("Password Change Error:", error);
      toast.error(error.response?.data?.message || "Failed to change password");
    }
  };

  return (
    <div className="mt-6">
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="w-full py-3 rounded-lg border border-500 text-white-500 hover:bg-green-900/10 transition duration-200"
        >
          Change Password
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current Password */}
          <div className="relative">
            <input
              type={showPassword.current ? "text" : "password"}
              name="currentPassword"
              placeholder="Current Password"
              value={form.currentPassword}
              onChange={handleChange}
              className="w-full px-4 py-3 pr-12 rounded-lg border border-white-500 bg-base-200 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            />
            <button
              type="button"
              className="absolute inset-y-0 right-3 flex items-center text-gray-400"
              onClick={() => toggleVisibility("current")}
            >
              {showPassword.current ? <EyeOff /> : <Eye />}
            </button>
          </div>

          {/* New Password */}
          <div className="relative">
            <input
              type={showPassword.new ? "text" : "password"}
              name="newPassword"
              placeholder="New Password"
              value={form.newPassword}
              onChange={handleChange}
              className="w-full px-4 py-3 pr-12 rounded-lg border border-white-500 bg-base-200 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            />
            <button
              type="button"
              className="absolute inset-y-0 right-3 flex items-center text-gray-400"
              onClick={() => toggleVisibility("new")}
            >
              {showPassword.new ? <EyeOff /> : <Eye />}
            </button>
          </div>

          {/* Confirm Password */}
          <div className="relative">
            <input
              type={showPassword.confirm ? "text" : "password"}
              name="confirmPassword"
              placeholder="Confirm New Password"
              value={form.confirmPassword}
              onChange={handleChange}
              className="w-full px-4 py-3 pr-12 rounded-lg border border-white-500 bg-base-200 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            />
            <button
              type="button"
              className="absolute inset-y-0 right-3 flex items-center text-gray-400"
              onClick={() => toggleVisibility("confirm")}
            >
              {showPassword.confirm ? <EyeOff /> : <Eye />}
            </button>
          </div>

          {/* Buttons */}
          <div className="flex gap-2">
            <button
              type="submit"
              className="w-full py-3 rounded-md bg-green-500 hover:bg-green-600 text-white font-semibold transition duration-200"
            >
              Update Password
            </button>
            <button
              type="button"
              onClick={() => {
                setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
                setShowForm(false);
              }}
              className="w-full py-3 rounded-md bg-gray-700 hover:bg-gray-600 text-white font-semibold transition duration-200"
            >
              Cancel
            </button>

          </div>
        </form>
      )}
    </div>
  );
};

export default ChangePasswordForm;
