import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [patients, setPatients] = useState([])
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [newPatientName, setNewPatientName] = useState('')
  const [newPatientRoom, setNewPatientRoom] = useState('')
  const [filter, setFilter] = useState('all')
  const [view, setView] = useState('dashboard')
  const [showAddPatientPage, setShowAddPatientPage] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  
  const [nurseName, setNurseName] = useState('')
  const [showCorrectionModal, setShowCorrectionModal] = useState(false)
  const [correctionReason, setCorrectionReason] = useState('')
  const [pendingTemp, setPendingTemp] = useState(null)
  const [doctorNotes, setDoctorNotes] = useState('')
  const [showDischargeModal, setShowDischargeModal] = useState(false)
  const [dischargeDecision, setDischargeDecision] = useState(null)
  const [dischargeReason, setDischargeReason] = useState('')
  const [showTempWarning, setShowTempWarning] = useState(false)
  const [reportingPeriod, setReportingPeriod] = useState('30')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [priorityCollapsed, setPriorityCollapsed] = useState(false)
  const [statsInfoCollapsed, setStatsInfoCollapsed] = useState(true)

  const MAX_CAPACITY = 74

  useEffect(() => {
    const initialPatients = Array.from({ length: 74 }, (_, i) => ({
      id: i + 1,
      name: `Patient ${i + 1}`,
      room: i + 1,
      status: 'active',
      admissionDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      temperatureLog: [],
      doctorVisits: [],
      feverFreeDays: 0,
      lastFeverDate: null,
      dischargeStatus: null,
      doctorApproved: false,
      finalized: false
    }))
    setPatients(initialPatients)
  }, [])

  const today = new Date().toISOString().split('T')[0]

  const getTodayTemp = (patient) => {
    return patient.temperatureLog.find(log => log.date === today)
  }

  const getTodayDoctorVisit = (patient) => {
    return patient.doctorVisits.find(visit => visit.date === today)
  }

  const isRoomOccupied = (roomNumber) => {
    return patients.some(p => p.status === 'active' && p.room === parseInt(roomNumber))
  }

  const getActivePatientCount = () => {
    return patients.filter(p => p.status === 'active').length
  }

  const addTemperature = (patientId, temperature) => {
    const patient = patients.find(p => p.id === patientId)
    const existingLog = getTodayTemp(patient)

    if (existingLog) {
      setPendingTemp({ patientId, temperature })
      setShowCorrectionModal(true)
      return
    }

    if (!nurseName.trim()) {
      alert('Please enter nurse name before recording temperature')
      return
    }

    setPatients(patients.map(p => {
      if (p.id !== patientId) return p
      
      const newLog = [...p.temperatureLog]
      newLog.push({ 
        date: today, 
        temperature, 
        time: new Date().toLocaleTimeString(),
        nurse: nurseName,
        corrected: false
      })

      const hasFever = temperature >= 38
      let feverFreeDays = p.feverFreeDays
      let lastFeverDate = p.lastFeverDate

      if (hasFever) {
        feverFreeDays = 0
        lastFeverDate = today
      } else if (lastFeverDate) {
        const daysSinceFever = Math.floor((new Date(today) - new Date(lastFeverDate)) / (1000 * 60 * 60 * 24))
        feverFreeDays = daysSinceFever - 1
      } else {
        feverFreeDays = feverFreeDays + 1
      }

      return { ...p, temperatureLog: newLog, feverFreeDays, lastFeverDate }
    }))
  }

  const confirmTemperatureCorrection = () => {
    if (!correctionReason.trim()) {
      alert('Please provide a reason for the correction')
      return
    }

    setPatients(patients.map(p => {
      if (p.id !== pendingTemp.patientId) return p
      
      const newLog = p.temperatureLog.map(log => 
        log.date === today 
          ? { 
              ...log, 
              temperature: pendingTemp.temperature, 
              time: new Date().toLocaleTimeString(),
              nurse: nurseName,
              corrected: true,
              correctionReason,
              originalTemp: log.temperature
            } 
          : log
      )

      const hasFever = pendingTemp.temperature >= 38
      let feverFreeDays = p.feverFreeDays
      let lastFeverDate = p.lastFeverDate

      if (hasFever) {
        feverFreeDays = 0
        lastFeverDate = today
      } else if (lastFeverDate) {
        const daysSinceFever = Math.floor((new Date(today) - new Date(lastFeverDate)) / (1000 * 60 * 60 * 24))
        feverFreeDays = daysSinceFever - 1
      } else {
        feverFreeDays = feverFreeDays + 1
      }

      return { ...p, temperatureLog: newLog, feverFreeDays, lastFeverDate }
    }))

    setShowCorrectionModal(false)
    setCorrectionReason('')
    setPendingTemp(null)
  }

  const addDoctorVisit = (patientId) => {
    const patient = patients.find(p => p.id === patientId)
    const todayTemp = getTodayTemp(patient)

    if (!todayTemp) {
      setShowTempWarning(true)
      return
    }

    setPatients(patients.map(p => {
      if (p.id !== patientId) return p
      
      const existingVisit = p.doctorVisits.find(visit => visit.date === today)
      let newVisits = existingVisit ? [...p.doctorVisits] : [...p.doctorVisits]
      
      if (existingVisit) {
        newVisits = newVisits.map(visit => 
          visit.date === today ? { ...visit, notes: doctorNotes, time: new Date().toLocaleTimeString() } : visit
        )
      } else {
        newVisits.push({ date: today, notes: doctorNotes, time: new Date().toLocaleTimeString() })
      }

      return { ...p, doctorVisits: newVisits }
    }))

    setDoctorNotes('')
  }

  const processDischargeDecision = () => {
    if (!dischargeReason.trim()) {
      alert('Please provide a reason for the discharge decision')
      return
    }

    if (dischargeDecision === 'approve') {
      setPatients(patients.map(p => 
        p.id === selectedPatient.id 
          ? { ...p, doctorApproved: true, dischargeStatus: 'approved', dischargeReason }
          : p
      ))
    } else {
      setPatients(patients.map(p => 
        p.id === selectedPatient.id 
          ? { ...p, dischargeStatus: 'rejected', dischargeReason }
          : p
      ))
    }

    setShowDischargeModal(false)
    setDischargeDecision(null)
    setDischargeReason('')
    setSelectedPatient(null)
  }

  const dischargePatient = (patientId) => {
    setDischargeDecision('approve')
    setShowDischargeModal(true)
  }

  const rejectDischarge = (patientId) => {
    setDischargeDecision('reject')
    setShowDischargeModal(true)
  }

  const finalizeDischarge = (patientId) => {
    const patient = patients.find(p => p.id === patientId)
    if (!patient.doctorApproved) {
      alert('Cannot finalize discharge: Doctor approval is required first')
      return
    }

    setPatients(patients.map(p => 
      p.id === patientId 
        ? { ...p, status: 'discharged', dischargeDate: today, finalized: true, room: null }
        : p
    ))
    setSelectedPatient(null)
  }

  const markDeceased = (patientId) => {
    if (window.confirm('Are you sure you want to mark this patient as deceased? This action cannot be undone and will be logged for audit purposes.')) {
      setPatients(patients.map(p => 
        p.id === patientId ? { ...p, status: 'deceased', deathDate: today, finalized: true, room: null } : p
      ))
      setSelectedPatient(null)
    }
  }

  const addNewPatient = () => {
    if (!newPatientName || !newPatientRoom) {
      alert('Please fill in all fields')
      return
    }

    const roomNum = parseInt(newPatientRoom)
    
    if (roomNum < 1 || roomNum > MAX_CAPACITY) {
      alert(`Room number must be between 1 and ${MAX_CAPACITY}`)
      return
    }

    if (isRoomOccupied(roomNum)) {
      alert(`Room ${roomNum} is already occupied`)
      return
    }

    if (getActivePatientCount() >= MAX_CAPACITY) {
      alert(`Facility is at maximum capacity (${MAX_CAPACITY} patients)`)
      return
    }
    
    const newPatient = {
      id: Math.max(...patients.map(p => p.id)) + 1,
      name: newPatientName,
      room: roomNum,
      status: 'active',
      admissionDate: today,
      temperatureLog: [],
      doctorVisits: [],
      feverFreeDays: 0,
      lastFeverDate: null,
      dischargeStatus: null,
      doctorApproved: false,
      finalized: false
    }
    
    setPatients([...patients, newPatient])
    setNewPatientName('')
    setNewPatientRoom('')
  }

  const calculateStats = () => {
    const active = patients.filter(p => p.status === 'active').length
    const discharged = patients.filter(p => p.status === 'discharged').length
    const deceased = patients.filter(p => p.status === 'deceased').length
    const total = discharged + deceased
    const mortalityRate = total > 0 ? ((deceased / total) * 100).toFixed(1) : 'N/A'
    const successRate = total > 0 ? ((discharged / total) * 100).toFixed(1) : 'N/A'
    
    const needsTemp = patients.filter(p => p.status === 'active' && !getTodayTemp(p)).length
    const needsDoctor = patients.filter(p => p.status === 'active' && !getTodayDoctorVisit(p)).length
    const readyForDischarge = patients.filter(p => p.status === 'active' && p.feverFreeDays >= 3).length
    const awaitingApproval = patients.filter(p => p.status === 'active' && p.feverFreeDays >= 3 && !p.doctorApproved).length
    const approvedForDischarge = patients.filter(p => p.status === 'active' && p.doctorApproved && !p.finalized).length
    const highTemp = patients.filter(p => p.status === 'active' && getTodayTemp(p) && getTodayTemp(p).temperature >= 38).length

    return { 
      active, 
      discharged, 
      deceased, 
      mortalityRate, 
      successRate, 
      needsTemp, 
      needsDoctor, 
      readyForDischarge,
      awaitingApproval,
      approvedForDischarge,
      total,
      highTemp
    }
  }

  const stats = calculateStats()

  const filteredPatients = patients.filter(p => {
    if (view === 'discharge-queue') {
      return p.status === 'active' && p.feverFreeDays >= 3
    }
    if (view === 'records') {
      return p.status !== 'active'
    }
    
    if (filter === 'all') return p.status === 'active'
    if (filter === 'needs-temp') return p.status === 'active' && !getTodayTemp(p)
    if (filter === 'needs-doctor') return p.status === 'active' && !getTodayDoctorVisit(p)
    if (filter === 'ready-discharge') return p.status === 'active' && p.feverFreeDays >= 3
    return true
  })

  const getAvailableRooms = () => {
    const occupiedRooms = patients.filter(p => p.status === 'active').map(p => p.room)
    const allRooms = Array.from({ length: MAX_CAPACITY }, (_, i) => i + 1)
    return allRooms.filter(room => !occupiedRooms.includes(room))
  }

  const getPriorityPatients = () => {
    const priorities = []
    
    patients.filter(p => p.status === 'active').forEach(patient => {
      const todayTemp = getTodayTemp(patient)
      const todayDoctor = getTodayDoctorVisit(patient)
      
      // Overdue temperature
      if (!todayTemp) {
        priorities.push({
          patient,
          reason: 'Temperature not recorded',
          priority: 'urgent',
          lastUpdate: 'Not recorded'
        })
      }
      // High temperature
      else if (todayTemp.temperature >= 38) {
        priorities.push({
          patient,
          reason: `High temperature: ${todayTemp.temperature}°C`,
          priority: 'urgent',
          lastUpdate: todayTemp.time
        })
      }
      // Awaiting doctor visit
      else if (todayTemp && !todayDoctor) {
        priorities.push({
          patient,
          reason: 'Awaiting doctor review',
          priority: 'medium',
          lastUpdate: todayTemp.time
        })
      }
      // Ready for discharge but not approved
      else if (patient.feverFreeDays >= 3 && !patient.doctorApproved) {
        priorities.push({
          patient,
          reason: 'Ready for discharge - awaiting approval',
          priority: 'low',
          lastUpdate: `${patient.feverFreeDays} fever-free days`
        })
      }
    })
    
    return priorities
  }

  const priorityPatients = getPriorityPatients()
  const filteredPriority = priorityFilter === 'all' 
    ? priorityPatients 
    : priorityPatients.filter(p => p.priority === priorityFilter)

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>Clinical Operations</h2>
          <p>Management System</p>
        </div>
        <nav className="sidebar-nav">
          <button className={view === 'dashboard' ? 'active' : ''} onClick={() => setView('dashboard')}>
            Dashboard
          </button>
          <button className={view === 'patients' ? 'active' : ''} onClick={() => setView('patients')}>
            Patient Management
          </button>
          <button className={view === 'create-patient' ? 'active' : ''} onClick={() => setView('create-patient')}>
            New Admission
          </button>
          <button className={view === 'discharge-queue' ? 'active' : ''} onClick={() => setView('discharge-queue')}>
            Discharge Queue
          </button>
          <button className={view === 'records' ? 'active' : ''} onClick={() => setView('records')}>
            Patient Records
          </button>
        </nav>
        <div className="sidebar-footer">
          <p>Capacity: {stats.active} / {MAX_CAPACITY}</p>
          <p>Available Rooms: {MAX_CAPACITY - stats.active}</p>
        </div>
      </aside>

      <main className="main-content">
        <header className="header">
          <div className="header-content">
            <h1>
              {view === 'dashboard' && 'Clinical Operations Dashboard'}
              {view === 'patients' && 'Patient Management'}
              {view === 'create-patient' && 'New Admission'}
              {view === 'discharge-queue' && 'Discharge Queue'}
              {view === 'records' && 'Patient Records'}
            </h1>
            <p>Virus Quarantine & Treatment Facility</p>
          </div>
          <div className="header-meta">
            <div className="header-meta-item">
              <span className="header-meta-label">Date</span>
              <span className="header-meta-value">{new Date().toLocaleDateString()}</span>
            </div>
            <div className="header-meta-item">
              <span className="header-meta-label">Status</span>
              <span className={`status-badge ${stats.active >= MAX_CAPACITY ? 'warning' : 'operational'}`}>
                {stats.active >= MAX_CAPACITY ? 'At Capacity' : 'Operational'}
              </span>
            </div>
            <div className="header-meta-item">
              <span className="header-meta-label">User</span>
              <span className="header-meta-value">Dr. Admin</span>
            </div>
          </div>
        </header>

        {view === 'dashboard' && (
          <>
            <div className="stats-grid">
              <div className="stat-card" onClick={() => { setView('patients'); setFilter('all'); }}>
                <div className="stat-card-header">
                  <div className="stat-card-icon primary">👥</div>
                  <h3>Active Patients</h3>
                </div>
                <p className="stat-value">{stats.active}</p>
                <p className="stat-label">{MAX_CAPACITY - stats.active} rooms available</p>
              </div>
              <div className="stat-card" onClick={() => { setView('patients'); setFilter('needs-temp'); }}>
                <div className="stat-card-header">
                  <div className="stat-card-icon warning">🌡️</div>
                  <h3>Pending Temp</h3>
                </div>
                <p className="stat-value warning">{stats.needsTemp}</p>
                <p className="stat-label">Require recording</p>
              </div>
              <div className="stat-card" onClick={() => { setView('patients'); setFilter('needs-doctor'); }}>
                <div className="stat-card-header">
                  <div className="stat-card-icon primary">👨‍⚕️</div>
                  <h3>Awaiting Review</h3>
                </div>
                <p className="stat-value">{stats.needsDoctor}</p>
                <p className="stat-label">Doctor visit pending</p>
              </div>
              <div className="stat-card" onClick={() => { setView('patients'); setFilter('ready-discharge'); }}>
                <div className="stat-card-header">
                  <div className="stat-card-icon success">✅</div>
                  <h3>Ready Discharge</h3>
                </div>
                <p className="stat-value success">{stats.readyForDischarge}</p>
                <p className="stat-label">3+ fever-free days</p>
              </div>
              <div className="stat-card">
                <div className="stat-card-header">
                  <div className="stat-card-icon critical">🔥</div>
                  <h3>High Temp</h3>
                </div>
                <p className="stat-value critical">{stats.highTemp}</p>
                <p className="stat-label">≥38°C today</p>
              </div>
              <div className="stat-card">
                <div className="stat-card-header">
                  <div className="stat-card-icon success">🏥</div>
                  <h3>Discharged</h3>
                </div>
                <p className="stat-value success">{stats.discharged}</p>
                <p className="stat-label">Recovered</p>
              </div>
              <div className="stat-card">
                <div className="stat-card-header">
                  <div className="stat-card-icon critical">⚠️</div>
                  <h3>Deceased</h3>
                </div>
                <p className="stat-value critical">{stats.deceased}</p>
                <p className="stat-label">Recorded</p>
              </div>
              <div className="stat-card">
                <div className="stat-card-header">
                  <div className="stat-card-icon primary">📊</div>
                  <h3>Mortality Rate</h3>
                </div>
                <p className="stat-value">{stats.mortalityRate === 'N/A' ? 'N/A' : `${stats.mortalityRate}%`}</p>
                <p className="stat-label">{stats.mortalityRate === 'N/A' ? 'No outcomes yet' : `of ${stats.total} completed`}</p>
              </div>
              <div className="stat-card">
                <div className="stat-card-header">
                  <div className="stat-card-icon success">📈</div>
                  <h3>Success Rate</h3>
                </div>
                <p className="stat-value">{stats.successRate === 'N/A' ? 'N/A' : `${stats.successRate}%`}</p>
                <p className="stat-label">{stats.successRate === 'N/A' ? 'No outcomes yet' : `of ${stats.total} completed`}</p>
              </div>
            </div>

            <div className="priority-section">
              <div className="priority-header">
                <h2>Priority Attention</h2>
                <div className="priority-header-meta">
                  <span className="priority-count">{filteredPriority.length} items</span>
                  <select 
                    className="priority-filter" 
                    value={priorityFilter}
                    onChange={e => setPriorityFilter(e.target.value)}
                  >
                    <option value="all">All Priorities</option>
                    <option value="urgent">Urgent</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                  <button 
                    className="priority-toggle"
                    onClick={() => setPriorityCollapsed(!priorityCollapsed)}
                  >
                    {priorityCollapsed ? '▼' : '▲'}
                  </button>
                </div>
              </div>
              {!priorityCollapsed && (
                <div className="priority-list">
                {filteredPriority.length === 0 ? (
                  <p style={{ color: '#64748B', fontSize: '0.9rem', padding: '12px' }}>
                    No patients requiring immediate attention
                  </p>
                ) : (
                  filteredPriority.map((item, idx) => (
                    <div 
                      key={idx} 
                      className={`priority-item ${item.priority === 'urgent' ? 'urgent' : ''}`}
                      onClick={() => { setSelectedPatient(item.patient); setView('patients'); }}
                    >
                      <div className="priority-item-info">
                        <span className="priority-patient">{item.patient.name}</span>
                        <span className="priority-room">Room {item.patient.room}</span>
                        <span className="priority-reason">{item.reason}</span>
                      </div>
                      <button className="priority-action">View</button>
                    </div>
                  ))
                )}
              </div>
              )}
            </div>

            <div className="stats-info">
              <div className="stats-info-header" onClick={() => setStatsInfoCollapsed(!statsInfoCollapsed)}>
                <span>Statistics Info</span>
                <button className="stats-info-toggle">
                  {statsInfoCollapsed ? '▼' : '▲'}
                </button>
              </div>
              {!statsInfoCollapsed && (
                <div className="stats-info-content">
                  <p><strong>Completed Outcomes:</strong> {stats.total}</p>
                  <p><strong>Mortality Rate:</strong> {stats.mortalityRate === 'N/A' ? 'N/A' : `${stats.mortalityRate}%`}</p>
                  <p><strong>Success Rate:</strong> {stats.successRate === 'N/A' ? 'N/A' : `${stats.successRate}%`}</p>
                </div>
              )}
            </div>
          </>
        )}

        {view === 'patients' && (
          <>
            <div className="queue-header">
              <h2>Patient Management</h2>
              <p>View and manage all active patients in the facility</p>
            </div>

            <div className="action-bar">
              <div className="filter-buttons">
                <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>
                  All Active ({stats.active})
                </button>
                <button className={filter === 'needs-temp' ? 'active' : ''} onClick={() => setFilter('needs-temp')}>
                  Needs Temp ({stats.needsTemp})
                </button>
                <button className={filter === 'needs-doctor' ? 'active' : ''} onClick={() => setFilter('needs-doctor')}>
                  Needs Doctor ({stats.needsDoctor})
                </button>
                <button className={filter === 'ready-discharge' ? 'active' : ''} onClick={() => setFilter('ready-discharge')}>
                  Ready to Discharge ({stats.readyForDischarge})
                </button>
              </div>
            </div>
          </>
        )}

        {view === 'discharge-queue' && (
          <div className="queue-header">
            <h2>Discharge Queue</h2>
            <p>Patients meeting the 3-day fever-free criterion awaiting discharge processing</p>
            <div className="queue-stats">
              <span className="queue-stat">Awaiting Doctor Approval: {stats.awaitingApproval}</span>
              <span className="queue-stat approved">Approved, Awaiting Finalization: {stats.approvedForDischarge}</span>
            </div>
          </div>
        )}

        {view === 'records' && (
          <div className="queue-header">
            <h2>Patient Records</h2>
            <p>Historical records of discharged and deceased patients (preserved for audit)</p>
          </div>
        )}

        {view === 'create-patient' && (
          <div className="create-patient-page">
            <div className="queue-header">
              <h2>New Admission</h2>
              <p>Add new patients to the facility and assign rooms</p>
            </div>
            <div className="add-patient-form">
              <div className="capacity-info">
                <p><strong>Current Capacity:</strong> {getActivePatientCount()}/{MAX_CAPACITY}</p>
                <p><strong>Available Rooms:</strong> {MAX_CAPACITY - getActivePatientCount()}</p>
              </div>
              <div className="form-group">
                <label>Patient Name</label>
                <input 
                  type="text" 
                  value={newPatientName}
                  onChange={e => setNewPatientName(e.target.value)}
                  placeholder="Enter patient name"
                />
              </div>
              <div className="form-group">
                <label>Room Number (1-{MAX_CAPACITY})</label>
                <input 
                  type="number" 
                  value={newPatientRoom}
                  onChange={e => setNewPatientRoom(e.target.value)}
                  placeholder="Enter room number"
                  min="1"
                  max={MAX_CAPACITY}
                />
                {newPatientRoom && isRoomOccupied(newPatientRoom) && (
                  <p className="error-text">Room {newPatientRoom} is already occupied</p>
                )}
                {newPatientRoom && !isRoomOccupied(newPatientRoom) && (
                  <p className="success-text">Room {newPatientRoom} is available</p>
                )}
              </div>
              <div className="form-group">
                <label>Or select from available rooms:</label>
                <div className="available-rooms">
                  {getAvailableRooms().slice(0, 20).map(room => (
                    <button 
                      key={room}
                      className="room-option"
                      onClick={() => setNewPatientRoom(room.toString())}
                    >
                      {room}
                    </button>
                  ))}
                  {getAvailableRooms().length > 20 && (
                    <span className="more-rooms">+{getAvailableRooms().length - 20} more</span>
                  )}
                </div>
              </div>
              <button 
                className="btn-primary" 
                onClick={addNewPatient}
                disabled={getActivePatientCount() >= MAX_CAPACITY}
              >
                Add Patient
              </button>
              {getActivePatientCount() >= MAX_CAPACITY && (
                <p className="error-text">Facility at maximum capacity</p>
              )}
            </div>
          </div>
        )}

        {(view === 'patients' || view === 'discharge-queue' || view === 'records') && (
          <div className="patient-grid">
          {filteredPatients.map(patient => {
            const todayTemp = getTodayTemp(patient)
            const todayDoctor = getTodayDoctorVisit(patient)
            
            return (
              <div 
                key={patient.id} 
                className={`patient-card ${patient.feverFreeDays >= 3 ? 'ready-discharge' : ''} ${patient.status !== 'active' ? 'archived' : ''}`}
                onClick={() => setSelectedPatient(patient)}
              >
                <div className="patient-header">
                  <h3>{patient.name}</h3>
                  {patient.room && <span className="room-badge">Room {patient.room}</span>}
                  {!patient.room && <span className="room-badge released">Released</span>}
                </div>
                <div className="patient-info">
                  <p>Status: <strong className={patient.status === 'discharged' ? 'success' : patient.status === 'deceased' ? 'danger' : ''}>{patient.status}</strong></p>
                  {patient.status === 'active' && (
                    <>
                      <p>Admitted: {patient.admissionDate}</p>
                      <p>Fever-free days: <strong>{patient.feverFreeDays}</strong>/3</p>
                    </>
                  )}
                  {patient.status === 'discharged' && <p>Discharged: {patient.dischargeDate}</p>}
                  {patient.status === 'deceased' && <p>Death Date: {patient.deathDate}</p>}
                </div>
                {patient.status === 'active' && (
                  <div className="status-indicators">
                    <div className={`indicator ${todayTemp ? 'complete' : 'pending'}`}>
                      Temp: {todayTemp ? `${todayTemp.temperature}°C` : 'Not recorded'}
                    </div>
                    <div className={`indicator ${todayDoctor ? 'complete' : 'pending'}`}>
                      Doctor: {todayDoctor ? 'Visited' : 'Pending'}
                    </div>
                  </div>
                )}
                {patient.feverFreeDays >= 3 && patient.status === 'active' && (
                  <div className={`discharge-badge ${patient.doctorApproved ? 'approved' : ''}`}>
                    {patient.doctorApproved ? 'Doctor Approved' : 'Awaiting Approval'}
                  </div>
                )}
              </div>
            )
          })}
        </div>
        )}
      </main>

      {selectedPatient && (
        <div className="modal-overlay" onClick={() => setSelectedPatient(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedPatient.name} {selectedPatient.room ? `- Room ${selectedPatient.room}` : '(Released)'}</h2>
              <button className="close-btn" onClick={() => setSelectedPatient(null)}>Close</button>
            </div>
            
            <div className="modal-tabs">
              <button 
                className={`modal-tab ${activeTab === 'overview' ? 'active' : ''}`}
                onClick={() => setActiveTab('overview')}
              >
                Overview
              </button>
              <button 
                className={`modal-tab ${activeTab === 'temperature' ? 'active' : ''}`}
                onClick={() => setActiveTab('temperature')}
              >
                Temperature & Vitals
              </button>
              <button 
                className={`modal-tab ${activeTab === 'doctor' ? 'active' : ''}`}
                onClick={() => setActiveTab('doctor')}
              >
                Doctor Visits
              </button>
              {selectedPatient.status === 'active' && (
                <button 
                  className={`modal-tab ${activeTab === 'discharge' ? 'active' : ''}`}
                  onClick={() => setActiveTab('discharge')}
                >
                  Discharge
                </button>
              )}
            </div>
            
            <div className="modal-body">
              <div className={`tab-content ${activeTab === 'overview' ? 'active' : ''}`}>
                <div className="patient-details">
                  <p><strong>Patient ID:</strong> {selectedPatient.id}</p>
                  <p><strong>Room:</strong> {selectedPatient.room || 'Released'}</p>
                  <p><strong>Status:</strong> {selectedPatient.status}</p>
                  {selectedPatient.status === 'active' && (
                    <>
                      <p><strong>Admission Date:</strong> {selectedPatient.admissionDate}</p>
                      <p><strong>Fever-free Days:</strong> {selectedPatient.feverFreeDays}/3</p>
                      {selectedPatient.lastFeverDate && (
                        <p><strong>Last Fever Date:</strong> {selectedPatient.lastFeverDate}</p>
                      )}
                    </>
                  )}
                  {selectedPatient.status === 'discharged' && (
                    <>
                      <p><strong>Discharge Date:</strong> {selectedPatient.dischargeDate}</p>
                      <p><strong>Doctor Approved:</strong> Yes</p>
                    </>
                  )}
                  {selectedPatient.status === 'deceased' && (
                    <p><strong>Death Date:</strong> {selectedPatient.deathDate}</p>
                  )}
                </div>
                
                {selectedPatient.status === 'active' && (
                  <div className="action-section">
                    <h3>Pending Actions</h3>
                    {!getTodayTemp(selectedPatient) && (
                      <p className="warning-text">⚠️ Temperature not recorded today</p>
                    )}
                    {getTodayTemp(selectedPatient) && !getTodayDoctorVisit(selectedPatient) && (
                      <p className="warning-text">⚠️ Doctor visit pending</p>
                    )}
                    {selectedPatient.feverFreeDays >= 3 && !selectedPatient.doctorApproved && (
                      <p className="success-text">✓ Ready for discharge approval</p>
                    )}
                    {selectedPatient.doctorApproved && !selectedPatient.finalized && (
                      <p className="success-text">✓ Approved for discharge - awaiting finalization</p>
                    )}
                  </div>
                )}
              </div>

              <div className={`tab-content ${activeTab === 'temperature' ? 'active' : ''}`}>
                {selectedPatient.status === 'active' && (
                  <>
                    <div className="action-section">
                      <h3>Record Temperature</h3>
                      <div className="form-group">
                        <label>Nurse Name</label>
                        <input 
                          type="text" 
                          value={nurseName}
                          onChange={e => setNurseName(e.target.value)}
                          placeholder="Enter your name"
                        />
                      </div>
                      <div className="temp-inputs">
                        {[36.5, 37, 37.5, 38, 38.5, 39, 39.5, 40].map(temp => (
                          <button 
                            key={temp}
                            className={`temp-btn ${temp >= 38 ? 'fever' : 'normal'}`}
                            onClick={() => addTemperature(selectedPatient.id, temp)}
                          >
                            {temp}°C
                          </button>
                        ))}
                      </div>
                      <p className="today-temp">
                        Today's temperature: {getTodayTemp(selectedPatient)?.temperature ? `${getTodayTemp(selectedPatient).temperature}°C` : 'Not recorded'}
                        {getTodayTemp(selectedPatient)?.corrected && (
                          <span className="correction-badge"> (Corrected)</span>
                        )}
                      </p>
                      {getTodayTemp(selectedPatient)?.corrected && (
                        <p className="correction-info">
                          Original: {getTodayTemp(selectedPatient).originalTemp}°C | 
                          Reason: {getTodayTemp(selectedPatient).correctionReason}
                        </p>
                      )}
                    </div>

                    <div className="action-section">
                      <h3>Temperature History</h3>
                      <div className="log-list">
                        {selectedPatient.temperatureLog.slice(-7).reverse().map((log, idx) => (
                          <div key={idx} className="log-item">
                            <span>{log.date}</span>
                            <span className={log.temperature >= 38 ? 'fever' : 'normal'}>
                              {log.temperature}°C
                            </span>
                            <span>{log.time}</span>
                            <span>Nurse: {log.nurse || 'N/A'}</span>
                            {log.corrected && <span className="correction-badge">Corrected</span>}
                          </div>
                        ))}
                        {selectedPatient.temperatureLog.length === 0 && <p>No records</p>}
                      </div>
                    </div>
                  </>
                )}
                {selectedPatient.status !== 'active' && (
                  <p>Patient is no longer active - temperature recording disabled</p>
                )}
              </div>

              <div className={`tab-content ${activeTab === 'doctor' ? 'active' : ''}`}>
                {selectedPatient.status === 'active' && (
                  <>
                    <div className="action-section">
                      <h3>Record Doctor Visit</h3>
                      <div className="form-group">
                        <label>Doctor Notes</label>
                        <textarea
                          value={doctorNotes}
                          onChange={e => setDoctorNotes(e.target.value)}
                          placeholder="Add visit notes..."
                          rows="3"
                        />
                      </div>
                      <button 
                        className={`btn-action ${getTodayDoctorVisit(selectedPatient) ? 'complete' : ''}`}
                        onClick={() => addDoctorVisit(selectedPatient.id)}
                      >
                        {getTodayDoctorVisit(selectedPatient) ? 'Visited Today' : 'Mark as Visited'}
                      </button>
                    </div>

                    <div className="action-section">
                      <h3>Visit History</h3>
                      <div className="log-list">
                        {selectedPatient.doctorVisits.slice(-7).reverse().map((visit, idx) => (
                          <div key={idx} className="log-item">
                            <span>{visit.date}</span>
                            <span>{visit.time}</span>
                            <span>{visit.notes || 'No notes'}</span>
                          </div>
                        ))}
                        {selectedPatient.doctorVisits.length === 0 && <p>No visits recorded</p>}
                      </div>
                    </div>
                  </>
                )}
                {selectedPatient.status !== 'active' && (
                  <p>Patient is no longer active - doctor visits disabled</p>
                )}
              </div>

              {selectedPatient.status === 'active' && (
                <div className={`tab-content ${activeTab === 'discharge' ? 'active' : ''}`}>
                  <div className="patient-details">
                    <p><strong>Fever-free Days:</strong> {selectedPatient.feverFreeDays}/3</p>
                    <p><strong>Required:</strong> 3 consecutive fever-free days</p>
                    <p><strong>Doctor Approval:</strong> {selectedPatient.doctorApproved ? 'Approved' : 'Pending'}</p>
                    {selectedPatient.dischargeStatus && (
                      <p><strong>Doctor Decision:</strong> {selectedPatient.dischargeStatus === 'approved' ? 'Approved' : 'Rejected'}</p>
                    )}
                    {selectedPatient.dischargeReason && (
                      <p><strong>Reason:</strong> {selectedPatient.dischargeReason}</p>
                    )}
                  </div>

                  {selectedPatient.feverFreeDays >= 3 && (
                    <div className="action-section">
                      <h3>Discharge Decision</h3>
                      {!selectedPatient.doctorApproved ? (
                        <div className="discharge-buttons">
                          <button className="btn-success" onClick={() => dischargePatient(selectedPatient.id)}>
                            Approve Discharge
                          </button>
                          <button className="btn-warning" onClick={() => rejectDischarge(selectedPatient.id)}>
                            Reject Discharge
                          </button>
                        </div>
                      ) : (
                        <div className="finalization-section">
                          <p className="approval-notice">Doctor has approved this patient for discharge</p>
                          <button className="btn-success" onClick={() => finalizeDischarge(selectedPatient.id)}>
                            Finalize Discharge
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {selectedPatient.feverFreeDays < 3 && (
                    <p className="warning-text">Patient not yet eligible for discharge (requires 3 fever-free days)</p>
                  )}

                  <div className="action-section danger-zone">
                    <h3>Emergency Actions</h3>
                    <p style={{ marginBottom: '12px', fontSize: '0.9rem' }}>This action is irreversible and requires authorization</p>
                    <button className="btn-danger" onClick={() => {
                      if (confirm('Are you sure you want to mark this patient as deceased? This action cannot be undone.')) {
                        markDeceased(selectedPatient.id)
                      }
                    }}>
                      Mark as Deceased
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showCorrectionModal && (
        <div className="modal-overlay" onClick={() => setShowCorrectionModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Temperature Correction Required</h2>
              <button className="close-btn" onClick={() => setShowCorrectionModal(false)}>Close</button>
            </div>
            <div className="modal-body">
              <p>A temperature reading has already been recorded for this patient today.</p>
              <p><strong>Current reading:</strong> {getTodayTemp(patients.find(p => p.id === pendingTemp?.patientId))?.temperature}C</p>
              <p><strong>New reading:</strong> {pendingTemp?.temperature}C</p>
              <div className="form-group">
                <label>Reason for correction (required)</label>
                <textarea
                  value={correctionReason}
                  onChange={e => setCorrectionReason(e.target.value)}
                  placeholder="Explain why this correction is necessary..."
                  rows="4"
                />
              </div>
              <button className="btn-warning" onClick={confirmTemperatureCorrection}>
                Confirm Correction
              </button>
            </div>
          </div>
        </div>
      )}

      {showDischargeModal && (
        <div className="modal-overlay" onClick={() => setShowDischargeModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{dischargeDecision === 'approve' ? 'Approve Discharge' : 'Reject Discharge'}</h2>
              <button className="close-btn" onClick={() => setShowDischargeModal(false)}>Close</button>
            </div>
            <div className="modal-body">
              <p>Please provide a reason for this decision:</p>
              <div className="form-group">
                <label>Reason (required)</label>
                <textarea
                  value={dischargeReason}
                  onChange={e => setDischargeReason(e.target.value)}
                  placeholder={dischargeDecision === 'approve' ? 'Patient meets discharge criteria...' : 'Patient not ready for discharge because...'}
                  rows="4"
                />
              </div>
              <button 
                className={dischargeDecision === 'approve' ? 'btn-success' : 'btn-warning'}
                onClick={processDischargeDecision}
              >
                {dischargeDecision === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showTempWarning && (
        <div className="modal-overlay" onClick={() => setShowTempWarning(false)}>
          <div className="modal warning-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Temperature Not Recorded</h2>
              <button className="close-btn" onClick={() => setShowTempWarning(false)}>Close</button>
            </div>
            <div className="modal-body">
              <p>The daily temperature has not been recorded for this patient yet.</p>
              <p>Please ensure a nurse records the temperature before the doctor visit.</p>
              <p className="warning-text">The doctor may need to measure the temperature themselves or return later.</p>
              <button className="btn-warning" onClick={() => setShowTempWarning(false)}>
                I Understand
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
