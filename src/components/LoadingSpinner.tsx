export default function LoadingSpinner({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="min-h-screen bg-[#0d0b1f] text-white flex flex-col justify-center items-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mb-4"></div>
      <p className="text-gray-400 text-sm">{message}</p>
    </div>
  );
} 