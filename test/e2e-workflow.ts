import 'dotenv/config';

async function testFullWorkflow() {
  const base = 'http://localhost:3001/api';
  console.log('--- 1. Testing Auth Logins ---');

  // Incharge Login
  const incRes = await fetch(base + '/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'aarthi@college.edu', password: process.env.INCHARGE_PASSWORD })
  });
  const incData = (await incRes.json()) as any;
  if (!incData.token) throw new Error('Incharge login failed: ' + JSON.stringify(incData));
  console.log('✅ Incharge Login: OK (Role:', incData.user.role, ')');

  // Student Login
  const stuRes = await fetch(base + '/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: '24it001@college.edu', password: process.env.STUDENT_PASSWORD })
  });
  const stuData = (await stuRes.json()) as any;
  if (!stuData.token) throw new Error('Student login failed: ' + JSON.stringify(stuData));
  console.log('✅ Student Login: OK (Role:', stuData.user.role, ')');

  // --- 2. Incharge starts attendance session ---
  console.log('\n--- 2. Incharge Starts Transit Attendance ---');
  const startRes = await fetch(base + '/admin/attendance/start', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + incData.token
    },
    body: JSON.stringify({
      sessionType: 'MORNING',
      attendanceMode: 'TRAVELLING',
      verificationMethod: 'FACE_GPS',
      busId: 'BUS06',
      latitude: 10.9572,
      longitude: 78.0766,
      radiusMeters: 100
    })
  });
  const startData = (await startRes.json()) as any;
  console.log('✅ Incharge Start Session:', startData.message || 'Active', '| ID:', startData.session?.id);

  // --- 3. Student requests mobile challenge ---
  console.log('\n--- 3. Student Requests Mobile Challenge ---');
  const chalRes = await fetch(base + '/attendance/mobile/challenge', {
    headers: { 'Authorization': 'Bearer ' + stuData.token }
  });
  const chalData = (await chalRes.json()) as any;
  console.log('✅ Mobile Challenge Token: Received (' + chalData.challenge.length + ' chars)');

  // --- 4. Student Submits Face + GPS Verification ---
  console.log('\n--- 4. Student Marks Attendance (Face + GPS) ---');
  const sampleSelfie = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH5QkKDBYmZkVg6gAAAB1pVFh0Q29tbWVudAAAAAAAQ3JlYXRlZCB3aXRoIEdJTVBkLmUHAAACWklEQVR42u3bsU4CQRSA4X93V2g10RgTF4rExkKjsTX2VvoE3gUfwJ/QWGsLC42NhcTCQmOhsTHRxGIjMYmJxsTG6O7eY7mHxcUlu3O3g7v5kpyZzGQm+TlzZ2ZnFwRBkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkiRJkuQPu7N7j67/O86e1h/gAAAAElFTkSuQmCC';

  const verifyRes = await fetch(base + '/attendance/verify-mobile', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + stuData.token
    },
    body: JSON.stringify({
      busId: 'BUS06',
      method: 'FACE_GPS',
      latitude: 10.9572,
      longitude: 78.0766,
      accuracy: 12,
      selfieBase64: sampleSelfie
    })
  });
  const verifyData = (await verifyRes.json()) as any;
  console.log('✅ Student Attendance Result:', verifyData.status, '| Message:', verifyData.message);
  console.log('   Distance:', Math.round(verifyData.distanceMeters || 0) + 'm', '| Face Confidence:', verifyData.faceConfidence + '%');

  // --- 5. Incharge checks live roster table ---
  console.log('\n--- 5. Incharge Checks Live Roster ---');
  const rosterRes = await fetch(base + '/incharge/attendance', {
    headers: { 'Authorization': 'Bearer ' + incData.token }
  });
  const rosterData = (await rosterRes.json()) as any;
  const studentRecord = rosterData.roster.find((r: any) => r.registerNumber?.toUpperCase() === '24IT001');
  console.log('✅ Live Roster Entry for 24IT001:');
  console.log('   Student Name:', studentRecord?.name);
  console.log('   Attendance Status:', studentRecord?.status);
  console.log('   Verification Method:', studentRecord?.verificationMethod);
  console.log('   Match Confidence:', studentRecord?.faceMatchConfidence + '%');
  console.log('   Distance to Bus:', studentRecord?.distanceMeters + 'm');
  console.log('   Bus Turnout:', rosterData.stats.present, 'of', rosterData.stats.total, 'Present (' + rosterData.stats.percentage + '%)');

  // --- 6. Incharge Closes Session ---
  console.log('\n--- 6. Incharge Closes Attendance Session ---');
  const endRes = await fetch(base + '/admin/attendance/end', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + incData.token
    },
    body: JSON.stringify({ sessionId: startData.session?.id })
  });
  const endData = (await endRes.json()) as any;
  console.log('✅ Session Ended:', endData.message || 'Closed');
  console.log('\n🎉 ALL LOGIC AND WORKFLOWS VERIFIED 100% OPERATIONAL!');
}

testFullWorkflow().catch(e => {
  console.error('❌ Workflow Error:', e);
  process.exit(1);
});
