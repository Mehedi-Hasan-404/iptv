// src/app/error.tsx

'use client'; // Error components must be Client Components

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-900 text-white p-4 text-center">
      <div className="max-w-md">
        <h2 className="text-3xl font-bold text-red-500 mb-4">
          Something went wrong!
        </h2>
        <p className="text-gray-400 mb-6">
          An unexpected error has occurred. Please try again or contact support if the issue persists.
        </p>
        
        {/* The digest is a unique ID for the server-side error, useful for debugging */}
        {error.digest && (
          <p className="text-sm text-gray-500 mb-6">
            Error Digest: {error.digest}
          </p>
        )}
        
        <button
          onClick={() => reset()}
          className="play-btn"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
