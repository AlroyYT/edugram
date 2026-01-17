import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Cookies from 'js-cookie';
import { backend_url } from '@/components/config';
import styles from '../styles/kinesthetic.module.css';

interface DragItem {
  id: string;
  label: string;
  category: string;
}

interface Category {
  name: string;
  emoji: string;
}

const KinestheticLearning = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('interactive');
  const [topic, setTopic] = useState('');
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [matches, setMatches] = useState<Record<string, string>>({});
  const [dragItems, setDragItems] = useState<DragItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [simulationRunning, setSimulationRunning] = useState(false);
  const [simProgress, setSimProgress] = useState(0);
  const [draggedComponent, setDraggedComponent] = useState<{ type: string; id?: string } | null>(null);
  const [circuitRequest, setCircuitRequest] = useState('');
  const [circuitDesign, setCircuitDesign] = useState<any>(null);
  const [circuitLoading, setCircuitLoading] = useState(false);
  const [circuitError, setCircuitError] = useState<string | null>(null);

  // Check if cookies exist, if not redirect to quiz
  useEffect(() => {
    const hasLearningStyle = Cookies.get('kinesthetic');
    if (!hasLearningStyle) {
      router.push('/quiz');
    }
  }, [router]);

  // Animation loop for simulation
  useEffect(() => {
    if (!simulationRunning) return;
    
    const interval = setInterval(() => {
      setSimProgress((prev) => {
        if (prev >= 100) {
          setSimulationRunning(false);
          return 0;
        }
        return prev + 2;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [simulationRunning]);

  const handleGenerateDragMatch = async () => {
    if (!topic.trim()) {
      setError('Please enter a topic');
      return;
    }

    setLoading(true);
    setError(null);
    setMatches({});

    try {
      const response = await fetch(`${backend_url}/api/generate-drag-and-match/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ topic }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to generate items');
      }

      const data = await response.json();
      setCategories(data.categories);
      setDragItems(data.items);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const generateCircuitDesign = async () => {
    if (!circuitRequest.trim()) {
      setCircuitError('Please describe what circuit you want to learn about');
      return;
    }

    setCircuitLoading(true);
    setCircuitError(null);
    setCircuitDesign(null);

    try {
      const response = await fetch(`${backend_url}/api/design-digital-circuit/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ request: circuitRequest }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to design circuit');
      }

      const data = await response.json();
      setCircuitDesign(data);
    } catch (err: any) {
      setCircuitError(err.message);
    } finally {
      setCircuitLoading(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, item: any) => {
    setDraggedItem(item.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, category: string) => {
    e.preventDefault();
    if (draggedItem) {
      const draggedItemObj = dragItems.find((item) => item.id === draggedItem);
      if (draggedItemObj?.category === category) {
        setMatches((prev) => ({
          ...prev,
          [draggedItem]: category,
        }));
      } else {
        alert('❌ Try again! That item belongs to a different category.');
      }
      setDraggedItem(null);
    }
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  const resetMatching = () => {
    setMatches({});
  };

  const availableItems = dragItems.filter((item) => !matches[item.id]);

  return (
    <div className={styles.kinestheticContainer}>
      {/* Animated Background */}
      <div className={styles.bgElements}>
        <div className={styles.circle1}></div>
        <div className={styles.circle2}></div>
        <div className={styles.circle3}></div>
        <div className={styles.wave}></div>
      </div>

      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>
          🎮 Kinesthetic Learning Hub
        </h1>
        <p className={styles.subtitle}>
          Learn by doing! Drag, interact, and explore hands-on activities
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className={styles.tabNav}>
        <button
          className={`${styles.tabBtn} ${activeTab === 'interactive' ? styles.active : ''}`}
          onClick={() => setActiveTab('interactive')}
        >
          📦 Interactive Matching
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === 'simulation' ? styles.active : ''}`}
          onClick={() => setActiveTab('simulation')}
        >
          ⚡ Circuit Simulator
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === 'os' ? styles.active : ''}`}
          onClick={() => setActiveTab('os')}
        >
          🖥️ Operating System
        </button>
      </div>

      {/* Content Sections */}
      <div className={styles.content}>
        {/* Interactive Matching */}
        {activeTab === 'interactive' && (
          <div className={styles.section}>
            <h2>🎯 Dynamic Drag & Match Categories</h2>
            <p>Enter what you want to learn, and AI will generate matching items for you!</p>

            {/* Topic Input */}
            <div className={styles.topicInputContainer}>
              <input
                type="text"
                placeholder="e.g., Photosynthesis, Solar System, Quantum Physics..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleGenerateDragMatch()}
                className={styles.topicInput}
              />
              <button
                className={styles.generateBtn}
                onClick={handleGenerateDragMatch}
                disabled={loading}
              >
                {loading ? '⏳ Generating...' : '✨ Generate Items'}
              </button>
            </div>

            {error && (
              <div className={styles.errorMsg}>❌ {error}</div>
            )}

            {dragItems.length > 0 ? (
              <>
                <div className={styles.matchingContainer}>
                  {/* Draggable Items */}
                  <div className={styles.itemsSection}>
                    <h3>📌 Items to Sort</h3>
                    <div className={styles.itemsList}>
                      {dragItems
                        .filter((item) => !matches[item.id])
                        .map((item) => (
                          <div
                            key={item.id}
                            className={styles.draggableItem}
                            draggable
                            onDragStart={(e) => handleDragStart(e, item)}
                            onDragEnd={handleDragEnd}
                          >
                            {item.label}
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Drop Zones */}
                  <div className={styles.dropZonesSection}>
                    <h3>📂 Categories</h3>
                    <div className={styles.dropZones}>
                      {categories.map((category) => (
                        <div
                          key={category.name}
                          className={styles.dropZone}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, category.name)}
                        >
                          <div className={styles.dropZoneTitle}>
                            {category.emoji} {category.name}
                          </div>
                          <div className={styles.droppedItems}>
                            {dragItems
                              .filter((item) => matches[item.id] === category.name)
                              .map((item) => (
                                <div key={item.id} className={styles.droppedItem}>
                                  ✓ {item.label}
                                </div>
                              ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <button className={styles.resetBtn} onClick={resetMatching}>
                  🔄 Reset
                </button>
                {Object.keys(matches).length === dragItems.length && dragItems.length > 0 && (
                  <div className={styles.successMsg}>🎉 Perfect! All items matched!</div>
                )}
              </>
            ) : (
              <div className={styles.placeholderMsg}>
                Enter a topic above to generate interactive learning items
              </div>
            )}
          </div>
        )}

        {/* Digital Logic Circuit Designer */}
        {activeTab === 'simulation' && (
          <div className={styles.section}>
            <h2>⚡ Digital Logic Circuit Designer</h2>
            <p>Describe a circuit you want to learn about, and AI will design it for you</p>

            {/* Request Input */}
            <div className={styles.circuitRequestContainer}>
              <input
                type="text"
                placeholder="e.g., 'Create an AND gate circuit' or 'Build a circuit that outputs 1 when both inputs are different'"
                value={circuitRequest}
                onChange={(e) => setCircuitRequest(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && generateCircuitDesign()}
                className={styles.circuitInput}
              />
              <button
                className={styles.designBtn}
                onClick={generateCircuitDesign}
                disabled={circuitLoading}
              >
                {circuitLoading ? '🔄 Designing...' : '✨ Design Circuit'}
              </button>
            </div>

            {circuitError && (
              <div className={styles.errorMsg}>❌ {circuitError}</div>
            )}

            {circuitDesign && (
              <div className={styles.circuitDesignContainer}>
                {/* Circuit Diagram */}
                <div className={styles.circuitDiagram}>
                  <h3>Circuit Design</h3>
                  <svg width="100%" height="350" style={{ background: '#fafafa', border: '2px solid #ddd', borderRadius: '8px' }}>
                    {/* Draw components */}
                    {circuitDesign.components?.map((comp: any, idx: number) => {
                      const x = 80 + idx * 120;
                      const y = 100;
                      return (
                        <g key={comp.id}>
                          {/* Component Box */}
                          <rect
                            x={x - 40}
                            y={y - 30}
                            width="80"
                            height="60"
                            fill="white"
                            stroke="#667eea"
                            strokeWidth="2"
                            rx="5"
                          />
                          {/* Component Icon/Label */}
                          <text
                            x={x}
                            y={y + 5}
                            textAnchor="middle"
                            fontSize="14"
                            fontWeight="bold"
                            fill="#667eea"
                          >
                            {comp.type === 'INPUT' ? '📥' : comp.type === 'OUTPUT' ? '📤' : comp.type}
                          </text>
                          <text
                            x={x}
                            y={y + 22}
                            textAnchor="middle"
                            fontSize="11"
                            fill="#666"
                          >
                            {comp.label}
                          </text>
                        </g>
                      );
                    })}

                    {/* Draw connections */}
                    {circuitDesign.connections?.map((conn: any, idx: number) => (
                      <line
                        key={`conn-${idx}`}
                        x1={conn.fromX}
                        y1={conn.fromY}
                        x2={conn.toX}
                        y2={conn.toY}
                        stroke="#764ba2"
                        strokeWidth="2"
                      />
                    ))}
                  </svg>
                </div>

                {/* Circuit Details */}
                <div className={styles.circuitDetails}>
                  <h3>Circuit Details</h3>

                  <div className={styles.detailBox}>
                    <h4>Description</h4>
                    <p>{circuitDesign.description}</p>
                  </div>

                  <div className={styles.detailBox}>
                    <h4>How It Works</h4>
                    <p>{circuitDesign.explanation}</p>
                  </div>

                  {circuitDesign.truthTable && (
                    <div className={styles.detailBox}>
                      <h4>Truth Table</h4>
                      <pre className={styles.truthTableDisplay}>
                        {circuitDesign.truthTable}
                      </pre>
                    </div>
                  )}

                  <div className={styles.detailBox}>
                    <h4>Components Used</h4>
                    <ul className={styles.componentsList}>
                      {circuitDesign.components?.map((comp: any, idx: number) => (
                        <li key={idx}>
                          <strong>{comp.type}</strong> - {comp.label}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {!circuitDesign && !circuitLoading && (
              <div className={styles.placeholderMsg}>
                Enter a circuit description above to get started!
              </div>
            )}
          </div>
        )}

        {/* Operating System */}
        {activeTab === 'os' && (
          <div className={styles.section}>
            <h2>🖥️ Operating System Basics</h2>
            <p>Coming soon! Learn about OS concepts interactively.</p>
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>🔨</div>
              <p>This section is under development</p>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Links */}
      <div className={styles.footer}>
        <Link href="/">← Back Home</Link>
      </div>
    </div>
  );
};

export default KinestheticLearning;
