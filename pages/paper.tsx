import { useState } from 'react';
import Head from 'next/head';

interface Paper {
  title: string;
  url: string;
  authors: string;
  year: string;
  abstract: string;
  error?: string;
}

interface SearchForm {
  title: string;
  author: string;
  year: string;
}

export default function Home() {
  const [formData, setFormData] = useState<SearchForm>({
    title: '',
    author: '',
    year: ''
  });
  const [results, setResults] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      setError('Paper title is required');
      return;
    }

    setLoading(true);
    setError('');
    setResults([]);

    try {
      const response = await fetch('https://edugram-574544346633.asia-south1.run.app/api/search-paper/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        setResults(data.results);
        if (data.results.length === 0) {
          setError('No papers found matching your criteria');
        }
      } else {
        setError(data.error || 'Failed to search papers');
      }
    } catch (err) {
      setError('Failed to connect to server. Make sure Django server is running.');
    } finally {
      setLoading(false);
    }
  };

  const clearForm = () => {
    setFormData({ title: '', author: '', year: '' });
    setResults([]);
    setError('');
  };

  return (
  <>
    <Head>
      <title>EDUGRAM Research Paper Finder</title>
      <meta name="description" content="Search and find research papers with the help of EDUGRAM" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <link rel="icon" href="/favicon.ico" />
    </Head>

    <div className={`main-layout ${results.length > 0 ? 'searched' : ''}`}>
      <header className="header-sticky">
        <h1 className="header-title">📚 EDUGRAM Research Paper Finder</h1>
      </header>

      <div className="content-wrapper">
        <div className="form-section">
          <form onSubmit={handleSubmit} className="search-form">
            <div className="form-group">
              <label htmlFor="title">Paper Title *</label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="Enter paper title..."
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="author">Author (Optional)</label>
              <input
                type="text"
                id="author"
                name="author"
                value={formData.author}
                onChange={handleInputChange}
                placeholder="Enter author name..."
              />
            </div>

            <div className="form-group">
              <label htmlFor="year">Year (Optional)</label>
              <input
                type="text"
                id="year"
                name="year"
                value={formData.year}
                onChange={handleInputChange}
                placeholder="e.g., 2023"
                pattern="[0-9]{4}"
                title="Please enter a 4-digit year"
              />
            </div>

            <div className="form-buttons">
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? '🔍 Searching...' : '🔍 Search Papers'}
              </button>
              <button type="button" onClick={clearForm} className="btn-secondary">
                🗑️ Clear
              </button>
            </div>
          </form>
        </div>

        {results.length > 0 && (
          <div className="results-section">
            <h2>Search Results ({results.length} found)</h2>
            <div className="results-grid">
              {results.map((paper, index) => (
                <div key={index} className="paper-card">
                  {paper.error ? (
                    <div className="error-card">
                      <h3>Error</h3>
                      <p>{paper.error}</p>
                    </div>
                  ) : (
                    <>
                      <h3 className="paper-title">
                        {paper.url && paper.url !== '#' ? (
                          <a href={paper.url} target="_blank" rel="noopener noreferrer">
                            {paper.title}
                          </a>
                        ) : (
                          paper.title
                        )}
                      </h3>

                      <div className="paper-meta">
                        <span className="authors">👤 {paper.authors}</span>
                        <span className="year">📅 {paper.year}</span>
                      </div>

                      {paper.abstract && paper.abstract !== 'Not available' && (
                        <div className="abstract">
                          <h4>Abstract:</h4>
                          <p>{paper.abstract}</p>
                        </div>
                      )}

                      {paper.url && paper.url !== '#' && (
                        <div className="paper-actions">
                          <a
                            href={paper.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-link"
                          >
                            📖 View Paper
                          </a>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>

    <style jsx>{`
      .main-layout {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        background: linear-gradient(160deg, #0a0f2f, #001233);
        color: #e0e7ff;
        min-height: 100vh;
        display: flex;
        flex-direction: column;
      }

      .header-sticky {
        position: sticky;
        top: 0;
        background-color: #1e3a8a;
        padding: 16px;
        text-align: center;
        z-index: 1000;
      }

      .header-title {
        color: white;
        font-weight: 700;
        font-size: 2rem;
      }

      .content-wrapper {
        display: flex;
        flex-direction: ${results.length > 0 ? 'row' : 'column'};
        padding: 20px;
        gap: 24px;
        justify-content: ${results.length > 0 ? 'flex-start' : 'center'};
        align-items: ${results.length > 0 ? 'flex-start' : 'center'};
      }

      .form-section {
        background: #0f172a;
        padding: 24px;
        border-radius: 16px;
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
        width: ${results.length > 0 ? '400px' : '100%'};
        max-width: 500px;
      }

      .search-form {
        display: flex;
        flex-direction: column;
        gap: 20px;
      }

      .form-group label {
        font-weight: 600;
        margin-bottom: 6px;
        display: block;
        color: #cbd5e1;
      }

      .form-group input {
        padding: 12px;
        border-radius: 8px;
        border: 1px solid #334155;
        background: #1e293b;
        color: white;
        width: 100%;
      }

      .form-buttons {
        display: flex;
        gap: 10px;
      }

      .btn-primary,
      .btn-secondary {
        padding: 10px 20px;
        border-radius: 8px;
        font-weight: 600;
        border: none;
        cursor: pointer;
      }

      .btn-primary {
        background: #3b82f6;
        color: white;
      }

      .btn-secondary {
        background: #475569;
        color: white;
      }

      .results-section {
        flex: 1;
      }

      .results-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
        gap: 20px;
      }

      .paper-card {
        background: #1e293b;
        padding: 16px;
        border-radius: 12px;
        border: 1px solid #334155;
        max-height: 350px;
        overflow-y: auto;
      }

      .paper-title {
        font-size: 1.1rem;
        font-weight: 600;
        margin-bottom: 8px;
      }

      .paper-meta {
        font-size: 0.9rem;
        color: #94a3b8;
        display: flex;
        gap: 10px;
        margin-bottom: 10px;
      }

      .abstract {
        font-size: 0.9rem;
        color: #ffffff;
        margin-bottom: 10px;
      }

      .abstract h4 {
        color: white;
        font-weight: 600;
        margin-bottom: 6px;
      }

      .btn-link {
        display: inline-block;
        background: #3b82f6;
        padding: 6px 12px;
        border-radius: 6px;
        color: white;
        text-decoration: none;
        font-size: 0.9rem;
      }

      .error-message {
        text-align: center;
        background: #b91c1c;
        color: white;
        margin: 16px auto;
        padding: 12px;
        border-radius: 8px;
        max-width: 600px;
      }
    `}</style>
  </>
);
}