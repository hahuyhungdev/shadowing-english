import { Link } from "react-router";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">404</h1>
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">
          Page Not Found
        </h2>

        <p className="text-gray-500 mb-8">
          The lesson or page you're looking for doesn't exist or has been moved.
          Let's get you back on track!
        </p>

        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
        >
          Back to Home
        </Link>

        <p className="text-xs text-gray-400 mt-6">
          If you think this is a mistake, please check the URL and try again.
        </p>
      </div>
    </div>
  );
}
