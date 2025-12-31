import { useState, useEffect } from 'react';
import Head from 'next/head';

export default function Visual() {
  const [topic, setTopic] = useState('');
  const [mermaidCode, setMermaidCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Initialize Mermaid when component mounts
    if (typeof window !== 'undefined') {
      import('mermaid').then((m) => {
        m.default.initialize({ 
          startOnLoad: true,
          theme: 'default',
          securityLevel: 'loose',
        });
      });
    }
  }, []);

  useEffect(() => {
    // Re-render Mermaid diagram when mermaidCode changes
    if (mermaidCode && typeof window !== 'undefined') {
      import('mermaid').then((m) => {
        m.default.contentLoaded();
      });
    }
  }, [mermaidCode]);

  const generateMindmap = async () => {
    if (!topic.trim()) {
      setError('Please enter a topic');
      return;
    }

    setLoading(true);
    setError('');
    setMermaidCode('');

    try {
      const response = await fetch('/api/generate-mindmap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ topic }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate mindmap');
      }

      // Force a small delay to ensure DOM is ready
      setTimeout(() => {
        setMermaidCode(data.mermaidCode);
      }, 100);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>AI Mindmap Generator</title>
        <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
      </Head>

      <div style={{ padding: '40px', maxWidth: '1400px', margin: '0 auto' }}>
        <h1 style={{ textAlign: 'center', marginBottom: '30px', fontSize: '2.5rem' }}>
          🧠 AI Mindmap Generator
        </h1>

        <div style={{ marginBottom: '30px', textAlign: 'center' }}>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && generateMindmap()}
            placeholder="Enter a topic (e.g., Operating Systems)"
            style={{
              padding: '12px 20px',
              fontSize: '16px',
              width: '400px',
              maxWidth: '100%',
              borderRadius: '8px',
              border: '2px solid #ddd',
              marginRight: '10px',
            }}
          />
          <button
            onClick={generateMindmap}
            disabled={loading}
            style={{
              padding: '12px 30px',
              fontSize: '16px',
              backgroundColor: loading ? '#ccc' : '#0070f3',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
            }}
          >
            {loading ? 'Generating...' : 'Generate Mindmap'}
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: '15px',
              backgroundColor: '#fee',
              color: '#c00',
              borderRadius: '8px',
              marginBottom: '20px',
              textAlign: 'center',
            }}
          >
            {error}
          </div>
        )}

        {mermaidCode && (
          <div
            style={{
              backgroundColor: '#ffffff',
              padding: '40px',
              borderRadius: '12px',
              border: '1px solid #ddd',
              overflow: 'auto',
              minHeight: '400px',
            }}
          >
            <div className="mermaid" key={mermaidCode}>
              {mermaidCode}
            </div>
          </div>
        )}

        {!mermaidCode && !loading && !error && (
          <div style={{ textAlign: 'center', color: '#666', marginTop: '50px', fontSize: '1.2rem' }}>
            Enter a topic above to generate an AI-powered mindmap 🚀
          </div>
        )}
      </div>
    </>
  );
}