// pages/summary.tsx
import React from "react";
import { useRouter } from "next/router";

const Summary = () => {
  const router = useRouter();
  const { summary } = router.query; // Get the summary from query parameters

  return (
    <div className="summary-page">
      <h2>Summary of Your Document</h2>
      {summary ? (
        <div className="summary-content">
          <p>{summary}</p>
        </div>
      ) : (
        <p>Loading summary...</p>
      )}
    </div>
  );
};

export default Summary;
