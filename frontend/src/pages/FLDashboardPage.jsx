import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Card,
  CardContent,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Divider,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Slider,
  Chip,
  IconButton
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import ScienceIcon from '@mui/icons-material/Science';
import ChatIcon from '@mui/icons-material/Chat';
import HistoryIcon from '@mui/icons-material/History';
import RefreshIcon from '@mui/icons-material/Refresh';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SendIcon from '@mui/icons-material/Send';
import SecurityIcon from '@mui/icons-material/Security';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
axios.defaults.timeout = 20000; // 20 seconds timeout to prevent infinite loading spinners on network hang
import SockJS from 'sockjs-client';
import Stomp from 'stompjs';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

let API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1/fl';
if (!API_BASE.endsWith('/fl')) {
  API_BASE = API_BASE + '/fl';
}

export default function FLDashboardPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);

  // FL Config States
  const [numClients, setNumClients] = useState(10);
  const [numRounds, setNumRounds] = useState(10);
  const [noiseMultiplier, setNoiseMultiplier] = useState(1.0);
  const [targetEpsilon, setTargetEpsilon] = useState(10.0);
  const [aggregationMethod, setAggregationMethod] = useState('median');

  // FL Local Lab States
  const [hospitals, setHospitals] = useState([]);
  const [selectedHospSamples, setSelectedHospSamples] = useState({});
  const [localTrainingState, setLocalTrainingState] = useState({});

  // Active Run States
  const [activeRun, setActiveRun] = useState(null);
  const [runStatus, setRunStatus] = useState('IDLE'); // IDLE, RUNNING, COMPLETED, FAILED
  const [roundMetrics, setRoundMetrics] = useState([]);
  const [clientRoundMetrics, setClientRoundMetrics] = useState({});
  const [healingEvents, setHealingEvents] = useState([]);
  const [consoleLogs, setConsoleLogs] = useState([]);

  // Chatbot States
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([
    {
      sender: 'ai',
      text: 'Hello Doctor! I am your AI Federated Learning Diagnostic Assistant. Ask me to diagnose a patient sample or query system security logs.',
      timestamp: new Date().toLocaleTimeString()
    }
  ]);
  const [selectedPatientCase, setSelectedPatientCase] = useState(null);

  // History States
  const [runsHistory, setRunsHistory] = useState([]);
  const [selectedHistoryRun, setSelectedHistoryRun] = useState(null);

  const stompClientRef = useRef(null);
  const logEndRef = useRef(null);

  // Pathology Cell Visualizer States
  const canvasRef = useRef(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (!selectedPatientCase) {
      // Draw idle placeholder
      ctx.fillStyle = '#111118';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.font = '13px "DM Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SCANNER IDLE', canvas.width / 2, canvas.height / 2 - 10);
      ctx.fillText('Select a patient case scan to load...', canvas.width / 2, canvas.height / 2 + 10);
      return;
    }
    
    // Set up scanning simulation loop
    setIsScanning(true);
    setScanProgress(0);
    
    let progress = 0;
    const interval = setInterval(() => {
      progress += 2;
      setScanProgress(progress);
      
      // Draw background biopsy structure
      ctx.fillStyle = '#0a0a0f';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Grid lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 20) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 20) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
      
      // Biopsy circular viewport frame
      ctx.strokeStyle = 'rgba(124, 58, 237, 0.2)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(canvas.width / 2, canvas.height / 2, 70, 0, Math.PI * 2);
      ctx.stroke();
      
      // Draw actual cells inside the circular viewport
      ctx.save();
      ctx.beginPath();
      ctx.arc(canvas.width / 2, canvas.height / 2, 68, 0, Math.PI * 2);
      ctx.clip(); // clip drawing inside the circular biopsy view
      
      if (selectedPatientCase.id === 1) {
        // Healthy colon mucosa: neatly organized cells
        ctx.fillStyle = 'rgba(16, 185, 129, 0.12)'; // light green cytoplasm
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.6)'; // green membrane
        ctx.lineWidth = 1.5;
        
        for (let x = canvas.width / 2 - 60; x <= canvas.width / 2 + 60; x += 24) {
          for (let y = canvas.height / 2 - 60; y <= canvas.height / 2 + 60; y += 24) {
            ctx.beginPath();
            ctx.arc(x, y, 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            
            // Draw blue cell nucleus in the center
            ctx.fillStyle = 'rgba(59, 130, 246, 0.8)';
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(16, 185, 129, 0.12)'; // restore color
          }
        }
      } 
      else if (selectedPatientCase.id === 4) {
        // Colorectal adenocarcinoma: chaotic, overlapping malformed cancer cells
        ctx.fillStyle = 'rgba(239, 68, 68, 0.15)'; // reddish cytoplasm
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)'; // red membrane
        ctx.lineWidth = 2;
        
        const cancerCells = [
          { x: -30, y: -25, r: 16 }, { x: -10, y: -35, r: 22 }, { x: 20, y: -20, r: 18 },
          { x: -35, y: 10, r: 24 }, { x: 5, y: 5, r: 20 }, { x: 35, y: 15, r: 15 },
          { x: -15, y: 35, r: 19 }, { x: 15, y: 30, r: 25 }, { x: 0, y: -5, r: 17 }
        ];
        
        cancerCells.forEach(cell => {
          ctx.beginPath();
          ctx.arc(canvas.width / 2 + cell.x, canvas.height / 2 + cell.y, cell.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          
          // Draw large, distorted dark-purple nucleus
          ctx.fillStyle = 'rgba(124, 58, 237, 0.9)';
          ctx.beginPath();
          ctx.arc(canvas.width / 2 + cell.x + (Math.sin(progress) * 2), canvas.height / 2 + cell.y + (Math.cos(progress) * 2), cell.r / 2.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'rgba(239, 68, 68, 0.15)'; // restore color
        });
      } 
      else if (selectedPatientCase.id === 7) {
        // Inflammatory stroma: spindle-like fibroblasts + scattered lymphocyte dots
        ctx.strokeStyle = 'rgba(156, 163, 175, 0.4)'; // stromal fibers
        ctx.lineWidth = 3;
        for (let i = -60; i <= 60; i += 20) {
          ctx.beginPath();
          ctx.moveTo(canvas.width / 2 - 60, canvas.height / 2 + i);
          ctx.lineTo(canvas.width / 2 + 60, canvas.height / 2 + i - 15);
          ctx.stroke();
        }
        
        // Spindle shaped cells
        ctx.fillStyle = 'rgba(245, 158, 11, 0.15)'; // orange/amber spindle
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.6)';
        ctx.lineWidth = 1.5;
        
        const spindles = [
          { x: -30, y: -20, w: 40, h: 10 },
          { x: 10, y: 15, w: 50, h: 12 },
          { x: -20, y: 30, w: 45, h: 10 }
        ];
        spindles.forEach(s => {
          ctx.save();
          ctx.translate(canvas.width / 2 + s.x, canvas.height / 2 + s.y);
          ctx.rotate(Math.PI / 12);
          ctx.beginPath();
          ctx.ellipse(0, 0, s.w / 2, s.h / 2, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        });
        
        // Lymphocyte infiltrates: small blue dots
        ctx.fillStyle = 'rgba(59, 130, 246, 0.95)';
        // Deterministic dot placement matching patient ID
        for (let i = 0; i < 25; i++) {
          const rx = Math.sin(i * 123) * 55;
          const ry = Math.cos(i * 456) * 55;
          ctx.beginPath();
          ctx.arc(canvas.width / 2 + rx, canvas.height / 2 + ry, 3.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
      
      // Laser scan line overlay
      const scanY = (progress / 100) * canvas.height;
      if (progress < 100) {
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.8)';
        ctx.lineWidth = 2.5;
        
        // Add a glowing laser line
        ctx.beginPath();
        ctx.moveTo(canvas.width / 2 - 70, scanY);
        ctx.lineTo(canvas.width / 2 + 70, scanY);
        ctx.stroke();
      }
      
      if (progress >= 100) {
        clearInterval(interval);
        setIsScanning(false);
      }
    }, 30);
    
    return () => clearInterval(interval);
  }, [selectedPatientCase]);

  // Hardcoded patient samples for diagnostic query convenience
  const patientCaseSamples = [
    { id: 1, name: "Normal Mucosa Scan (Patient #1)", type: "Normal colon mucosa", desc: "Patient age 48, colon screening scan, uniform cellular structures." },
    { id: 4, name: "Malignant suspect scan (Patient #4)", type: "Colorectal adenocarcinoma suspect", desc: "Patient age 62, persistent pain, irregular cellular clustering in biopsies." },
    { id: 7, name: "Inflammatory stroma scan (Patient #7)", type: "Tumor-associated stroma suspect", desc: "Patient age 55, high white blood count, fibrosis indicators present." }
  ];

  useEffect(() => {
    fetchHistory();
    fetchLocalStatus();
    initializeHospitalCards();
    return () => disconnectWebSocket();
  }, []);

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [consoleLogs]);

  // Initial setup for hospitals
  const initializeHospitalCards = () => {
    const defaultHosp = [];
    for (let i = 0; i < 10; i++) {
      defaultHosp.push({
        id: i,
        name: `Hospital Client #${i + 1}`,
        samples: 20,
        status: 'IDLE',
        accuracy: 0.0,
        loss: 0.0
      });
    }
    setHospitals(defaultHosp);
  };

  const fetchLocalStatus = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await axios.get(`${API_BASE}/local/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data) {
        const sizes = res.data.sizes || {};
        const states = res.data.states || {};

        setHospitals(prev => prev.map(h => ({
          ...h,
          samples: sizes[h.id] || h.samples,
          status: states[h.id] || 'IDLE'
        })));
      }
    } catch (err) {
      console.error("Failed to load client local status", err);
    }
  };

  const handleLocalTrain = async (id) => {
    const token = localStorage.getItem('accessToken');
    const samples = selectedHospSamples[id] || 20;

    // Set local state to training progress
    setLocalTrainingState(prev => ({ ...prev, [id]: true }));

    try {
      const res = await axios.post(`${API_BASE}/local/train?clientId=${id}&samples=${samples}`, null, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data) {
        setHospitals(prev => prev.map(h => h.id === id ? {
          ...h,
          samples: res.data.samples,
          status: res.data.status,
          accuracy: res.data.localAccuracy,
          loss: res.data.localLoss
        } : h));
      }
    } catch (err) {
      console.error("Local training failed", err);
    } finally {
      setLocalTrainingState(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleResetLocal = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      await axios.post(`${API_BASE}/local/reset`, null, {
        headers: { Authorization: `Bearer ${token}` }
      });
      initializeHospitalCards();
    } catch (err) {
      console.error("Failed to reset clients", err);
    }
  };

  // WebSocket connection to SockJS/STOMP
  const connectWebSocket = (runId) => {
    disconnectWebSocket();
    
    // Dynamically derive WebSocket URL from API_BASE to handle HTTPS/WSS correctly
    let wsUrl = 'http://localhost:8080/ws';
    try {
      const url = new URL(API_BASE);
      wsUrl = `${url.protocol}//${url.host}/ws`;
    } catch (e) {
      console.error("Failed to parse API_BASE for WebSocket URL", e);
    }

    const socket = new SockJS(wsUrl);
    const client = Stomp.over(socket);
    client.debug = null; // Disable excessive console debugs

    client.connect({}, () => {
      stompClientRef.current = client;

      // Subscribe to metrics updates
      client.subscribe(`/topic/fl-metrics/${runId}`, (msg) => {
        const data = JSON.parse(msg.body);
        setRoundMetrics(prev => {
          // Avoid duplicate updates
          if (prev.some(m => m.roundNumber === data.roundNumber)) return prev;
          const updated = [...prev, data];
          return updated.sort((a, b) => a.roundNumber - b.roundNumber);
        });

        // Track per-client metrics for live curves
        if (data.clientMetrics) {
          setClientRoundMetrics(prev => {
            const copy = { ...prev };
            data.clientMetrics.forEach(cl => {
              if (!copy[cl.clientId]) copy[cl.clientId] = [];
              if (!copy[cl.clientId].some(item => item.round === data.roundNumber)) {
                copy[cl.clientId].push({
                  round: data.roundNumber,
                  accuracy: cl.localAccuracy,
                  loss: cl.localLoss
                });
              }
            });
            return copy;
          });
        }

        // Store healing events
        if (data.selfHealingEvents) {
          setHealingEvents(prev => [...prev, ...data.selfHealingEvents]);
        }
      });

      // Subscribe to live log terminal
      client.subscribe(`/topic/fl-logs/${runId}`, (msg) => {
        const data = JSON.parse(msg.body);
        setConsoleLogs(prev => [...prev, data.line]);
      });

      // Subscribe to run status updates
      client.subscribe(`/topic/fl-runs-status/${runId}`, (msg) => {
        setRunStatus(msg.body);
        if (msg.body === 'COMPLETED' || msg.body === 'FAILED') {
          fetchHistory();
        }
      });
    });
  };

  const disconnectWebSocket = () => {
    if (stompClientRef.current) {
      stompClientRef.current.disconnect();
      stompClientRef.current = null;
    }
  };

  const handleStartGlobalTraining = async () => {
    const token = localStorage.getItem('accessToken');
    setRunStatus('RUNNING');
    setRoundMetrics([]);
    setClientRoundMetrics({});
    setHealingEvents([]);
    setConsoleLogs(["Initializing global server instance...", "Reading custom hospital weight configurations..."]);

    try {
      const res = await axios.post(`${API_BASE}/runs/trigger`, {
        numClients,
        numRounds,
        noiseMultiplier,
        targetEpsilon,
        aggregationMethod
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data) {
        setActiveRun(res.data);
        connectWebSocket(res.data.id);
      }
    } catch (err) {
      console.error("Global FL start failed", err);
      setRunStatus('FAILED');
      setConsoleLogs(prev => [...prev, "❌ Failed to connect to Spring Boot Process builder. Please ensure the Python path matches."]);
    }
  };

  const handleStopTraining = async () => {
    if (!activeRun) return;
    try {
      const token = localStorage.getItem('accessToken');
      await axios.post(`${API_BASE}/runs/${activeRun.id}/stop`, null, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRunStatus('FAILED');
    } catch (err) {
      console.error("Failed to stop training run", err);
    }
  };

  const handleSendChat = async (directQuery = null) => {
    // If directQuery is a React event object rather than a string, fallback to chatInput
    const query = (typeof directQuery === 'string') ? directQuery : chatInput;
    if (!query || !query.trim()) return;

    const userMsg = {
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString()
    };
    setChatMessages(prev => [...prev, userMsg]);
    
    if (typeof directQuery !== 'string') {
      setChatInput('');
    }

    // Extract patient ID to attach visualization in the chat bubble
    let patientId = null;
    if (query.toLowerCase().includes('sample #')) {
      const parts = query.toLowerCase().split('sample #');
      if (parts.length > 1) {
        patientId = parseInt(parts[1].replace(/[^0-9]/g, '').trim());
      }
    }

    try {
      const token = localStorage.getItem('accessToken');
      // Default to active run ID or fallback to the latest run ID in database
      const runId = activeRun ? activeRun.id : (runsHistory[0] ? runsHistory[0].id : 1);

      const res = await axios.post(`${API_BASE}/chatbot/query?runId=${runId}`, {
        message: query
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data) {
        setChatMessages(prev => [...prev, {
          sender: 'ai',
          text: res.data.reply,
          timestamp: new Date().toLocaleTimeString(),
          patientId: patientId
        }]);
      }
    } catch (err) {
      console.error("Chatbot query failed", err);
      setChatMessages(prev => [...prev, {
        sender: 'ai',
        text: 'Sorry doctor, I was unable to compile that diagnostic. Please ensure a global model is trained.',
        timestamp: new Date().toLocaleTimeString()
      }]);
    }
  };

  const handleLoadCase = (item) => {
    setSelectedPatientCase(item);
    setChatInput(`Diagnose Patient Case Sample #${item.id}`);
  };

  const fetchHistory = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await axios.get(`${API_BASE}/runs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRunsHistory(res.data || []);
    } catch (err) {
      console.error("Failed to fetch runs history", err);
    }
  };

  const viewHistoryDetail = async (id) => {
    try {
      const token = localStorage.getItem('accessToken');
      const res = await axios.get(`${API_BASE}/runs/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedHistoryRun(res.data);
    } catch (err) {
      console.error("Failed to load detail", err);
    }
  };

  // Recharts Multi Line data formatter for hospital lines
  const getHospitalChartData = () => {
    const dataPoints = [];
    const maxRounds = roundMetrics.length;
    for (let r = 1; r <= maxRounds; r++) {
      const row = { round: r };
      hospitals.forEach(h => {
        const clientHistory = clientRoundMetrics[h.id] || [];
        const found = clientHistory.find(item => item.round === r);
        row[`hosp_${h.id}`] = found ? parseFloat(found.accuracy.toFixed(3)) : null;
      });
      dataPoints.push(row);
    }
    return dataPoints;
  };

  return (
    <Box sx={{ minHeight: '100vh', background: '#0a0a0f', p: 3, color: '#fff' }}>
      <Container maxWidth="xl">
        {/* Top Header Navigation */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton onClick={() => navigate('/dashboard')} sx={{ color: '#7c3aed' }}>
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h4" sx={{ fontFamily: '"Syne", sans-serif', fontWeight: 800 }}>
              FL Healthcare Dashboard
            </Typography>
          </Box>
          <Box>
            <Chip
              label={runStatus}
              color={runStatus === 'RUNNING' ? 'primary' : runStatus === 'COMPLETED' ? 'success' : runStatus === 'FAILED' ? 'error' : 'default'}
              sx={{ fontWeight: 'bold', fontSize: '14px', px: 1 }}
            />
          </Box>
        </Box>

        {/* Dynamic Tab Switcher */}
        <Paper sx={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', mb: 3 }}>
          <Tabs
            value={activeTab}
            onChange={(e, val) => setActiveTab(val)}
            textColor="primary"
            indicatorColor="primary"
            variant="fullWidth"
          >
            <Tab icon={<ScienceIcon />} label="Live FL Workspace" sx={{ textTransform: 'none', fontWeight: 'bold' }} />
            <Tab icon={<ChatIcon />} label="Diagnostic Chatbot Assistant" sx={{ textTransform: 'none', fontWeight: 'bold' }} />
            <Tab icon={<HistoryIcon />} label="Run History & Replay" sx={{ textTransform: 'none', fontWeight: 'bold' }} />
          </Tabs>
        </Paper>

        {/* TAB 1: WORKSPACE */}
        {activeTab === 0 && (
          <Grid container spacing={3}>
            {/* Run Configurations (left side) */}
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 3, background: '#111118', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px' }}>
                <Typography variant="h6" sx={{ fontFamily: '"Syne", sans-serif', fontWeight: 700, mb: 3 }}>
                  Federated Hyperparameters
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Simulated Hospital Count"
                      type="number"
                      value={numClients}
                      onChange={(e) => setNumClients(Math.max(2, parseInt(e.target.value) || 10))}
                      sx={{ input: { color: '#fff' } }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Global Rounds"
                      type="number"
                      value={numRounds}
                      onChange={(e) => setNumRounds(Math.max(1, parseInt(e.target.value) || 10))}
                      sx={{ input: { color: '#fff' } }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', mb: 0.5, display: 'block' }}>
                      Differential Privacy Noise: {noiseMultiplier}
                    </Typography>
                    <Slider
                      value={noiseMultiplier}
                      min={0.1}
                      max={4.0}
                      step={0.1}
                      onChange={(e, val) => setNoiseMultiplier(val)}
                      valueLabelDisplay="auto"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Target Privacy Budget (Epsilon)"
                      type="number"
                      value={targetEpsilon}
                      onChange={(e) => setTargetEpsilon(Math.max(0.1, parseFloat(e.target.value) || 10.0))}
                      sx={{ input: { color: '#fff' } }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <FormControl fullWidth>
                      <InputLabel id="agg-label">ASFA Exclusions & Strategy</InputLabel>
                      <Select
                        labelId="agg-label"
                        value={aggregationMethod}
                        onChange={(e) => setAggregationMethod(e.target.value)}
                        label="ASFA Exclusions & Strategy"
                        sx={{ color: '#fff' }}
                      >
                        <MenuItem value="median">ASFA + Median Aggregation</MenuItem>
                        <MenuItem value="cosine_filter">ASFA + Cosine Filtering</MenuItem>
                        <MenuItem value="trimmed_mean">Robust Trimmed Mean</MenuItem>
                        <MenuItem value="fedavg">Baseline FedAvg (No Defense)</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sx={{ display: 'flex', gap: 2, mt: 2 }}>
                    <Button
                      fullWidth
                      variant="contained"
                      onClick={handleStartGlobalTraining}
                      disabled={runStatus === 'RUNNING'}
                      sx={{ py: 1.5, background: 'linear-gradient(135deg, #7c3aed, #3b82f6)' }}
                      startIcon={<PlayArrowIcon />}
                    >
                      Train Global AI
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      onClick={handleStopTraining}
                      disabled={runStatus !== 'RUNNING'}
                      sx={{ py: 1.5 }}
                      startIcon={<StopIcon />}
                    >
                      Stop
                    </Button>
                  </Grid>
                </Grid>
              </Paper>

              {/* ASFA Self Healing Log Panel */}
              <Paper sx={{ p: 3, mt: 3, background: '#111118', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', maxHeight: '300px', overflowY: 'auto' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <SecurityIcon sx={{ color: '#10b981' }} />
                  <Typography variant="h6" sx={{ fontFamily: '"Syne", sans-serif', fontWeight: 700 }}>
                    ASFA Shield Activity
                  </Typography>
                </Box>
                {healingEvents.length === 0 ? (
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.45)', fontStyle: 'italic' }}>
                    Shield is active. Monitoring for client update anomalies...
                  </Typography>
                ) : (
                  <List dense>
                    {healingEvents.map((evt, idx) => (
                      <Box key={idx}>
                        <ListItem>
                          <ListItemText
                            primary={
                              <Typography variant="body2" sx={{ color: '#f87171', fontWeight: 'bold' }}>
                                {evt.eventType === 'quarantine' ? 'Hospital Quarantined' : evt.eventType === 'rollback_triggered' ? 'Rollback Triggered' : evt.eventType}
                              </Typography>
                            }
                            secondary={
                              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                                {evt.details}
                              </Typography>
                            }
                          />
                        </ListItem>
                        <Divider sx={{ borderColor: 'rgba(255,255,255,0.05)' }} />
                      </Box>
                    ))}
                  </List>
                )}
              </Paper>
            </Grid>

            {/* Live Chart Monitoring */}
            <Grid item xs={12} md={8}>
              <Paper sx={{ p: 3, background: '#111118', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', mb: 3 }}>
                <Typography variant="h6" sx={{ fontFamily: '"Syne", sans-serif', fontWeight: 700, mb: 2 }}>
                  Federated Learning Real-Time Accuracy / Loss
                </Typography>
                <Box sx={{ width: '100%', height: 350 }}>
                  <ResponsiveContainer width="100%" height="100%" key={roundMetrics.length}>
                    <LineChart data={roundMetrics}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="roundNumber" stroke="#e2e8f0" label={{ value: 'Round', position: 'insideBottom', offset: -5 }} />
                      <YAxis yAxisId="left" stroke="#7c3aed" label={{ value: 'Accuracy', angle: -90, position: 'insideLeft' }} />
                      <YAxis yAxisId="right" orientation="right" stroke="#3b82f6" label={{ value: 'Loss', angle: 90, position: 'insideRight' }} />
                      <Tooltip contentStyle={{ background: '#111118', borderColor: 'rgba(255,255,255,0.1)' }} />
                      <Legend />
                      <Line yAxisId="left" type="monotone" dataKey="globalAccuracy" name="Global Accuracy" stroke="#7c3aed" strokeWidth={3} activeDot={{ r: 8 }} />
                      <Line yAxisId="right" type="monotone" dataKey="globalLoss" name="Global Loss" stroke="#3b82f6" strokeWidth={2} />
                      <Line yAxisId="left" type="monotone" dataKey="epsilon" name="Epsilon Spent" stroke="#10b981" strokeWidth={1} />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              </Paper>

              {/* Linux Terminal Console output */}
              <Paper sx={{ p: 3, background: '#07070a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', fontFamily: 'monospace' }}>
                <Typography variant="subtitle2" sx={{ color: '#10b981', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <span>⬤</span> Log Terminal Console Output
                </Typography>
                <Box sx={{ height: '160px', overflowY: 'auto', p: 1, background: '#020204', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                  {consoleLogs.map((logLine, idx) => (
                    <Typography key={idx} variant="body2" sx={{ color: '#a7f3d0', fontSize: '13px', mb: 0.5 }}>
                      {logLine}
                    </Typography>
                  ))}
                  <div ref={logEndRef} />
                </Box>
              </Paper>
            </Grid>

            {/* Local Client Training Lab */}
            <Grid item xs={12}>
              <Paper sx={{ p: 3, background: '#111118', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h5" sx={{ fontFamily: '"Syne", sans-serif', fontWeight: 800 }}>
                    Hospitals Client Training Lab
                  </Typography>
                  <Button variant="outlined" color="primary" onClick={handleResetLocal} startIcon={<RefreshIcon />}>
                    Reset Hospital Datasets
                  </Button>
                </Box>
                <Grid container spacing={3}>
                  {hospitals.map((h) => (
                    <Grid item xs={12} sm={6} md={2.4} key={h.id}>
                      <Card sx={{
                        background: h.status === 'TRAINED' ? 'rgba(16,185,129,0.05)' : 'rgba(255,255,255,0.02)',
                        border: `1px solid ${h.status === 'TRAINED' ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.08)'}`,
                        borderRadius: '12px',
                        textAlign: 'center'
                      }}>
                        <CardContent sx={{ p: 2 }}>
                          <Typography variant="h6" sx={{ fontSize: '16px', fontWeight: 'bold' }}>
                            {h.name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', mb: 2, display: 'block' }}>
                            Dataset Size: {selectedHospSamples[h.id] || h.samples} samples
                          </Typography>

                          {h.status !== 'TRAINED' && (
                            <Box sx={{ mb: 2 }}>
                              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.3)', display: 'block', mb: 0.5 }}>
                                Select training data limit:
                              </Typography>
                              <Slider
                                size="small"
                                value={selectedHospSamples[h.id] || h.samples}
                                min={5}
                                max={100}
                                step={5}
                                onChange={(e, val) => setSelectedHospSamples(prev => ({ ...prev, [h.id]: val }))}
                                valueLabelDisplay="auto"
                              />
                            </Box>
                          )}

                          {h.status === 'TRAINED' ? (
                            <Box sx={{ mt: 1, mb: 1 }}>
                              <Typography variant="caption" sx={{ color: '#10b981', display: 'block', fontWeight: 'bold', mb: 0.5 }}>
                                Status: Local update computed
                              </Typography>
                              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)', display: 'block' }}>
                                Accuracy: {h.accuracy.toFixed(1)}% | Loss: {h.loss.toFixed(2)}
                              </Typography>
                            </Box>
                          ) : (
                            <Button
                              fullWidth
                              variant="outlined"
                              onClick={() => handleLocalTrain(h.id)}
                              disabled={localTrainingState[h.id]}
                              sx={{ textTransform: 'none', py: 0.5 }}
                            >
                              {localTrainingState[h.id] ? 'Training...' : 'Train Local Client'}
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Paper>
            </Grid>
          </Grid>
        )}

        {/* TAB 2: DIAGNOSTIC CHATBOT */}
        {activeTab === 1 && (
          <Grid container spacing={3}>
            {/* Patient sample loaders */}
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 3, background: '#111118', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px' }}>
                <Typography variant="h6" sx={{ fontFamily: '"Syne", sans-serif', fontWeight: 700, mb: 3 }}>
                  Doctor's Clinical Load Lab
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', mb: 3 }}>
                  Select one of the mock patient screening samples below to load them into the chatbot diagnosis tool.
                </Typography>
                {patientCaseSamples.map((sample) => (
                  <Card key={sample.id} sx={{
                    background: selectedPatientCase?.id === sample.id ? 'rgba(124,58,237,0.1)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${selectedPatientCase?.id === sample.id ? '#7c3aed' : 'rgba(255,255,255,0.05)'}`,
                    borderRadius: '12px',
                    mb: 2,
                    cursor: 'pointer'
                  }} onClick={() => handleLoadCase(sample)}>
                    <CardContent sx={{ p: 2 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: selectedPatientCase?.id === sample.id ? '#a78bfa' : '#fff' }}>
                        {sample.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', mt: 0.5, display: 'block' }}>
                        {sample.desc}
                      </Typography>
                    </CardContent>
                  </Card>
                ))}
              </Paper>
            </Grid>

            {/* Chatbot Interface */}
            <Grid item xs={12} md={8}>
              <Paper sx={{ p: 3, background: '#111118', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', display: 'flex', flexDirection: 'column', height: '550px' }}>
                <Box sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)', pb: 2, mb: 2 }}>
                  <Typography variant="h6" sx={{ fontFamily: '"Syne", sans-serif', fontWeight: 700 }}>
                    Federated Intelligence Chatbot
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)' }}>
                    Queries are evaluated directly against the parameters of the aggregated global model.
                  </Typography>
                </Box>

                {/* Messages feed */}
                <Box sx={{ flexGrow: 1, overflowY: 'auto', mb: 2, p: 2, background: 'rgba(0,0,0,0.2)', borderRadius: '12px' }}>
                  {chatMessages.map((msg, idx) => (
                    <Box key={idx} sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                      mb: 2
                    }}>
                      <Paper sx={{
                        p: 2,
                        maxWidth: '80%',
                        background: msg.sender === 'user' ? '#7c3aed' : 'rgba(255,255,255,0.04)',
                        border: msg.sender === 'user' ? 'none' : '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '16px',
                        color: '#fff'
                      }}>
                        <Typography variant="body1" style={{ whiteSpace: 'pre-wrap' }}>
                          {msg.text}
                        </Typography>
                        {msg.patientId && (
                          <Box sx={{ mt: 1.5, display: 'flex', justifyContent: 'center' }}>
                            <BiopsyVisualizer patientId={msg.patientId} />
                          </Box>
                        )}
                      </Paper>
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.3)', mt: 0.5, mx: 1 }}>
                        {msg.timestamp}
                      </Typography>
                    </Box>
                  ))}
                </Box>

                {/* Suggested Questions Quick Chips */}
                <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                  {[
                    { label: "🔍 Diagnose Patient Case #4", query: "Diagnose Patient Case Sample #4" },
                    { label: "🛡️ Check Security & ASFA Health", query: "Is the training secure?" },
                    { label: "📊 Explain Accuracy Trends", query: "Explain global accuracy trends" }
                  ].map((q, idx) => (
                    <Chip
                      key={idx}
                      label={q.label}
                      onClick={() => handleSendChat(q.query)}
                      clickable
                      sx={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        color: '#a78bfa',
                        fontSize: '11px',
                        '&:hover': {
                          background: 'rgba(124,58,237,0.12)',
                          borderColor: '#7c3aed'
                        }
                      }}
                    />
                  ))}
                </Box>

                {/* Chat input form */}
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    fullWidth
                    placeholder="Type 'diagnose patient case sample #4' or query security status..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                    sx={{ input: { color: '#fff' } }}
                  />
                  <Button variant="contained" onClick={handleSendChat} sx={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)', px: 3 }}>
                    <SendIcon />
                  </Button>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        )}

        {/* TAB 3: RUN HISTORY */}
        {activeTab === 2 && (
          <Grid container spacing={3}>
            {/* Table of past runs */}
            <Grid item xs={12} md={selectedHistoryRun ? 5 : 12}>
              <Paper sx={{ p: 3, background: '#111118', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px' }}>
                <Typography variant="h6" sx={{ fontFamily: '"Syne", sans-serif', fontWeight: 700, mb: 3 }}>
                  Training Runs History
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ color: 'rgba(255,255,255,0.6)' }}>Run ID</TableCell>
                        <TableCell sx={{ color: 'rgba(255,255,255,0.6)' }}>Method</TableCell>
                        <TableCell sx={{ color: 'rgba(255,255,255,0.6)' }}>Clients/Rounds</TableCell>
                        <TableCell sx={{ color: 'rgba(255,255,255,0.6)' }}>Global Accuracy</TableCell>
                        <TableCell sx={{ color: 'rgba(255,255,255,0.6)' }}>Status</TableCell>
                        <TableCell sx={{ color: 'rgba(255,255,255,0.6)' }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {runsHistory.map((run) => (
                        <TableRow key={run.id} hover sx={{ cursor: 'pointer' }} onClick={() => viewHistoryDetail(run.id)}>
                          <TableCell sx={{ color: '#fff' }}>#{run.id}</TableCell>
                          <TableCell sx={{ color: '#fff' }}>ASFA (Dirichlet)</TableCell>
                          <TableCell sx={{ color: '#fff' }}>{run.numClients} / {run.numRounds}</TableCell>
                          <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>
                            {run.finalAccuracy ? `${(run.finalAccuracy * 100).toFixed(1)}%` : 'N/A'}
                          </TableCell>
                          <TableCell sx={{ color: '#fff' }}>
                            <Chip
                              size="small"
                              label={run.status}
                              color={run.status === 'COMPLETED' ? 'success' : 'error'}
                            />
                          </TableCell>
                          <TableCell>
                            <Button variant="outlined" size="small" onClick={(e) => { e.stopPropagation(); viewHistoryDetail(run.id); }}>
                              Replay Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {runsHistory.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} align="center" sx={{ color: 'rgba(255,255,255,0.4)', py: 3 }}>
                            No training runs logged in MySQL.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>

            {/* Run details replayer */}
            {selectedHistoryRun && (
              <Grid item xs={12} md={7}>
                <Paper sx={{ p: 3, background: '#111118', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <Typography variant="h6" sx={{ fontFamily: '"Syne", sans-serif', fontWeight: 700 }}>
                      Run Detail Replay (Run #{selectedHistoryRun.run.id})
                    </Typography>
                    <Button variant="text" color="error" onClick={() => setSelectedHistoryRun(null)}>
                      Close Detail
                    </Button>
                  </Box>
                  <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid item xs={6} md={3}>
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)' }}>Final Global Accuracy</Typography>
                      <Typography variant="h5" sx={{ color: '#10b981', fontWeight: 'bold' }}>
                        {selectedHistoryRun.run.finalAccuracy ? `${(selectedHistoryRun.run.finalAccuracy * 100).toFixed(1)}%` : 'N/A'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)' }}>Total Loss</Typography>
                      <Typography variant="h5" sx={{ color: '#3b82f6', fontWeight: 'bold' }}>
                        {selectedHistoryRun.run.finalLoss ? selectedHistoryRun.run.finalLoss.toFixed(4) : 'N/A'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)' }}>Total Epsilon spent</Typography>
                      <Typography variant="h5" sx={{ color: '#f59e0b', fontWeight: 'bold' }}>
                        {selectedHistoryRun.run.finalEpsilon ? `${selectedHistoryRun.run.finalEpsilon.toFixed(2)} ε` : 'N/A'}
                      </Typography>
                    </Grid>
                    <Grid item xs={6} md={3}>
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)' }}>Hospital Clients</Typography>
                      <Typography variant="h5" sx={{ color: '#fff', fontWeight: 'bold' }}>
                        {selectedHistoryRun.run.numClients} clients
                      </Typography>
                    </Grid>
                  </Grid>

                  {/* Replay graph */}
                  <Typography variant="subtitle2" sx={{ mb: 1, color: 'rgba(255,255,255,0.6)' }}>
                    Accuracy curve replay
                  </Typography>
                  <Box sx={{ width: '100%', height: 260, mb: 2 }}>
                    <ResponsiveContainer width="100%" height="100%" key={selectedHistoryRun?.roundMetrics?.length || 0}>
                      <LineChart data={selectedHistoryRun.roundMetrics}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="roundNumber" stroke="#e2e8f0" />
                        <YAxis yAxisId="left" stroke="#7c3aed" domain={[0, 1.05]} />
                        <YAxis yAxisId="right" orientation="right" stroke="#10b981" />
                        <Tooltip contentStyle={{ background: '#111118', borderColor: 'rgba(255,255,255,0.1)' }} />
                        <Line yAxisId="left" type="monotone" dataKey="globalAccuracy" name="Global Accuracy" stroke="#7c3aed" strokeWidth={3} />
                        <Line yAxisId="right" type="monotone" dataKey="epsilon" name="Epsilon" stroke="#10b981" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </Box>

                  {/* Confusion Matrix simulation heatmap */}
                  <Typography variant="subtitle2" sx={{ mb: 2, color: 'rgba(255,255,255,0.6)' }}>
                    MedMNIST Pathology Heatmap (Test Set Confusion Matrix)
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: 0.5, maxWidth: '360px', margin: '0 auto' }}>
                    {selectedHistoryRun.run.confusionMatrixJson ? (
                      JSON.parse(selectedHistoryRun.run.confusionMatrixJson).map((row, rIdx) => 
                        row.map((val, cIdx) => {
                          // Compute green intensity based on classification diagonal value
                          const isDiagonal = rIdx === cIdx;
                          const opacity = isDiagonal ? 0.35 + (val / 30.0) : 0.05 + (val / 10.0);
                          const bg = isDiagonal ? `rgba(16,185,129,${opacity})` : `rgba(239,68,68,${opacity})`;
                          
                          return (
                            <Box key={`${rIdx}-${cIdx}`} sx={{
                              background: bg,
                              aspectRatio: '1',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '10px',
                              fontWeight: 'bold',
                              borderRadius: '2px',
                              color: isDiagonal ? '#fff' : 'rgba(255,255,255,0.5)'
                            }} title={`Actual: ${rIdx}, Predicted: ${cIdx}`}>
                              {val}
                            </Box>
                          );
                        })
                      )
                    ) : (
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', gridColumn: 'span 9' }}>
                        No heatmap available.
                      </Typography>
                    )}
                  </Box>
                </Paper>
              </Grid>
            )}
          </Grid>
        )}
      </Container>
    </Box>
  );
}

function BiopsyVisualizer({ patientId }) {
  const canvasRef = useRef(null);
  const [progress, setProgress] = useState(0);
  const [scanning, setScanning] = useState(true);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += 2;
      setProgress(currentProgress);
      
      // Draw background
      ctx.fillStyle = '#0a0a0f';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Grid lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.lineWidth = 1;
      for (let x = 0; x < canvas.width; x += 20) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += 20) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
      
      // Biopsy circle frame
      ctx.strokeStyle = 'rgba(124, 58, 237, 0.2)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(canvas.width / 2, canvas.height / 2, 50, 0, Math.PI * 2);
      ctx.stroke();
      
      // Draw cells
      ctx.save();
      ctx.beginPath();
      ctx.arc(canvas.width / 2, canvas.height / 2, 48, 0, Math.PI * 2);
      ctx.clip();
      
      if (patientId === 1) {
        ctx.fillStyle = 'rgba(16, 185, 129, 0.12)';
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.6)';
        ctx.lineWidth = 1.5;
        for (let x = canvas.width / 2 - 40; x <= canvas.width / 2 + 40; x += 18) {
          for (let y = canvas.height / 2 - 40; y <= canvas.height / 2 + 40; y += 18) {
            ctx.beginPath();
            ctx.arc(x, y, 7, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = 'rgba(59, 130, 246, 0.8)';
            ctx.beginPath();
            ctx.arc(x, y, 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(16, 185, 129, 0.12)';
          }
        }
      } else if (patientId === 4) {
        ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)';
        ctx.lineWidth = 2;
        const cancerCells = [
          { x: -15, y: -15, r: 12 }, { x: -3, y: -20, r: 15 }, { x: 12, y: -10, r: 13 },
          { x: -20, y: 5, r: 16 }, { x: 3, y: 0, r: 13 }, { x: 20, y: 8, r: 10 },
          { x: -8, y: 20, r: 12 }, { x: 8, y: 15, r: 16 }
        ];
        cancerCells.forEach(cell => {
          ctx.beginPath();
          ctx.arc(canvas.width / 2 + cell.x, canvas.height / 2 + cell.y, cell.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = 'rgba(124, 58, 237, 0.9)';
          ctx.beginPath();
          ctx.arc(canvas.width / 2 + cell.x, canvas.height / 2 + cell.y, cell.r / 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
        });
      } else if (patientId === 7) {
        ctx.strokeStyle = 'rgba(156, 163, 175, 0.4)';
        ctx.lineWidth = 2;
        for (let i = -40; i <= 40; i += 12) {
          ctx.beginPath();
          ctx.moveTo(canvas.width / 2 - 45, canvas.height / 2 + i);
          ctx.lineTo(canvas.width / 2 + 45, canvas.height / 2 + i - 8);
          ctx.stroke();
        }
        ctx.fillStyle = 'rgba(245, 158, 11, 0.15)';
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.6)';
        ctx.lineWidth = 1.2;
        const spindles = [
          { x: -20, y: -12, w: 25, h: 6 },
          { x: 5, y: 8, w: 30, h: 8 },
          { x: -10, y: 15, w: 28, h: 6 }
        ];
        spindles.forEach(s => {
          ctx.save();
          ctx.translate(canvas.width / 2 + s.x, canvas.height / 2 + s.y);
          ctx.rotate(Math.PI / 12);
          ctx.beginPath();
          ctx.ellipse(0, 0, s.w / 2, s.h / 2, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        });
        ctx.fillStyle = 'rgba(59, 130, 246, 0.95)';
        for (let i = 0; i < 12; i++) {
          const rx = Math.sin(i * 123) * 35;
          const ry = Math.cos(i * 456) * 35;
          ctx.beginPath();
          ctx.arc(canvas.width / 2 + rx, canvas.height / 2 + ry, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
      
      // Laser scan
      const scanY = (currentProgress / 100) * canvas.height;
      if (currentProgress < 100) {
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(canvas.width / 2 - 50, scanY);
        ctx.lineTo(canvas.width / 2 + 50, scanY);
        ctx.stroke();
      } else {
        clearInterval(interval);
        setScanning(false);
      }
    }, 25);
    
    return () => clearInterval(interval);
  }, [patientId]);

  return (
    <Box sx={{ position: 'relative', width: '220px', height: '110px', background: '#0a0a0f', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden', my: 1 }}>
      <canvas ref={canvasRef} width={220} height={110} />
      {scanning && (
        <Box sx={{ position: 'absolute', bottom: 3, left: 3, right: 3, background: 'rgba(0,0,0,0.7)', py: 0.1, borderRadius: '4px', textAlign: 'center' }}>
          <Typography variant="caption" sx={{ color: '#10b981', fontWeight: 'bold', fontSize: '9px' }}>
            Inference Scan... {progress}%
          </Typography>
        </Box>
      )}
    </Box>
  );
}
