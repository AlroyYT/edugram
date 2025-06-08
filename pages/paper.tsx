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
      const response = await fetch('http://localhost:8000/api/search-paper/', {
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
        <title>Strad Research Paper Finder</title>
        <meta name="description" content="Search and find research papers from Strad Research" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="container">
        <header className="header">
          <h1>📚 Strad Research Paper Finder</h1>
          <p>Search for research papers from stradresearch.org</p>
        </header>

        <main className="main">
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

          {error && (
            <div className="error-message">
              ⚠️ {error}
            </div>
          )}

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
        </main>

        <footer className="footer">
          <p>Built with Django & Next.js | Scraping data from stradresearch.org</p>
        </footer>
      </div>

      <style jsx>{`
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #333;
        }

        .header {
          text-align: center;
          margin-bottom: 40px;
          padding: 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-radius: 15px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }

        .header h1 {
          margin: 0 0 10px 0;
          font-size: 2.5rem;
          font-weight: 700;
        }

        .header p {
          margin: 0;
          font-size: 1.1rem;
          opacity: 0.9;
        }

        .main {
          margin-bottom: 40px;
        }

        .search-form {
          background: white;
          padding: 30px;
          border-radius: 15px;
          box-shadow: 0 5px 20px rgba(0,0,0,0.1);
          margin-bottom: 30px;
          border: 1px solid #e1e5e9;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-weight: 600;
          color: #555;
          font-size: 0.95rem;
        }

        .form-group input {
          width: 100%;
          padding: 12px 16px;
          border: 2px solid #e1e5e9;
          border-radius: 8px;
          font-size: 1rem;
          transition: all 0.3s ease;
          box-sizing: border-box;
        }

        .form-group input:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .form-buttons {
          display: flex;
          gap: 15px;
          flex-wrap: wrap;
        }

        .btn-primary, .btn-secondary {
          padding: 12px 24px;
          border: none;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          text-decoration: none;
          display: inline-block;
          text-align: center;
        }

        .btn-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
        }

        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .btn-secondary {
          background: #f8f9fa;
          color: #6c757d;
          border: 2px solid #e9ecef;
        }

        .btn-secondary:hover {
          background: #e9ecef;
          border-color: #dee2e6;
        }

        .error-message {
          background: #f8d7da;
          color: #721c24;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 20px;
          border: 1px solid #f5c6cb;
        }

        .results-section {
          margin-top: 30px;
        }

        .results-section h2 {
          color: #333;
          margin-bottom: 20px;
          font-size: 1.5rem;
        }

        .results-grid {
          display: grid;
          gap: 20px;
          grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
        }

        .paper-card {
          background: white;
          border-radius: 12px;
          padding: 25px;
          box-shadow: 0 5px 15px rgba(0,0,0,0.08);
          border: 1px solid #e1e5e9;
          transition: all 0.3s ease;
        }

        .paper-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 25px rgba(0,0,0,0.15);
        }

        .paper-title {
          margin: 0 0 15px 0;
          font-size: 1.2rem;
          line-height: 1.4;
        }

        .paper-title a {
          color: #667eea;
          text-decoration: none;
          font-weight: 600;
        }

        .paper-title a:hover {
          text-decoration: underline;
        }

        .paper-meta {
          display: flex;
          gap: 20px;
          margin-bottom: 15px;
          font-size: 0.9rem;
          color: #666;
          flex-wrap: wrap;
        }

        .abstract {
          margin: 15px 0;
        }

        .abstract h4 {
          margin: 0 0 8px 0;
          font-size: 0.95rem;
          color: #555;
          font-weight: 600;
        }

        .abstract p {
          margin: 0;
          color: #666;
          line-height: 1.5;
          font-size: 0.9rem;
        }

        .paper-actions {
          margin-top: 15px;
          padding-top: 15px;
          border-top: 1px solid #eee;
        }

        .btn-link {
          display: inline-block;
          padding: 8px 16px;
          background: #667eea;
          color: white;
          text-decoration: none;
          border-radius: 6px;
          font-size: 0.9rem;
          font-weight: 500;
          transition: all 0.3s ease;
        }

        .btn-link:hover {
          background: #5a6fd8;
          transform: translateY(-1px);
        }

        .error-card {
          color: #721c24;
        }

        .error-card h3 {
          color: #721c24;
          margin-top: 0;
        }

        .footer {
          text-align: center;
          padding: 20px;
          border-top: 1px solid #eee;
          color: #666;
          font-size: 0.9rem;
        }

        @media (max-width: 768px) {
          .container {
            padding: 15px;
          }
          
          .header h1 {
            font-size: 2rem;
          }
          
          .search-form {
            padding: 20px;
          }
          
          .form-buttons {
            flex-direction: column;
          }
          
          .btn-primary, .btn-secondary {
            width: 100%;
          }
          
          .results-grid {
            grid-template-columns: 1fr;
          }
          
          .paper-meta {
            flex-direction: column;
            gap: 8px;
          }
        }
      `}</style>
    </>
  );
}