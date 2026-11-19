// Strength by Bram — stage 1
// Coach builds programs and assigns them to clients.
// Clients open today's session, log sets, and see their history.
// Data is saved on the device for now; stage 2 moves it to an online database
// so coach and clients share it across phones.

import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ---------- theme ----------
const C = {
  bg: '#0F1115',
  card: '#181B22',
  cardAlt: '#1F232C',
  border: '#2A2F3A',
  text: '#F2F4F7',
  muted: '#9AA3B2',
  accent: '#FF6B2C',
  accentDim: '#3A2418',
  good: '#3CCB7F',
  danger: '#FF5A5F',
};

const STORAGE_KEY = 'sbb.data.v1';

// ---------- helpers ----------
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

const formatDate = (iso) => {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
};

const confirm = (title, message, onYes) => {
  if (Platform.OS === 'web') {
    // Alert buttons don't work on web; fall back to the browser dialog.
    // eslint-disable-next-line no-alert
    if (typeof window !== 'undefined' && window.confirm(`${title}\n\n${message}`)) onYes();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Yes', style: 'destructive', onPress: onYes },
  ]);
};

const seedData = () => {
  const ex = (name, sets, reps) => ({ id: uid(), name, sets, reps, notes: '' });
  const program = {
    id: uid(),
    name: 'Full Body Strength — 3 days',
    days: [
      {
        id: uid(),
        name: 'Day A — Squat focus',
        exercises: [ex('Back Squat', 4, '6-8'), ex('Romanian Deadlift', 3, '8-10'), ex('DB Bench Press', 3, '8-12'), ex('Seated Cable Row', 3, '10-12')],
      },
      {
        id: uid(),
        name: 'Day B — Press focus',
        exercises: [ex('Barbell Bench Press', 4, '5-8'), ex('Lat Pulldown', 3, '8-12'), ex('Walking Lunge', 3, '10 each'), ex('Lateral Raise', 3, '12-15')],
      },
      {
        id: uid(),
        name: 'Day C — Hinge focus',
        exercises: [ex('Trap Bar Deadlift', 4, '5-6'), ex('Overhead Press', 3, '6-10'), ex('Leg Press', 3, '10-12'), ex('Plank', 3, '30-45s')],
      },
    ],
  };
  return {
    programs: [program],
    clients: [{ id: uid(), name: 'Sample Client', programId: program.id }],
    workouts: [],
  };
};

// ---------- small UI pieces ----------
const Btn = ({ title, onPress, kind = 'primary', small, style, disabled }) => (
  <Pressable
    onPress={onPress}
    disabled={disabled}
    style={({ pressed }) => [
      styles.btn,
      kind === 'primary' && { backgroundColor: C.accent },
      kind === 'secondary' && { backgroundColor: C.cardAlt, borderWidth: 1, borderColor: C.border },
      kind === 'danger' && { backgroundColor: 'transparent', borderWidth: 1, borderColor: C.danger },
      kind === 'ghost' && { backgroundColor: 'transparent' },
      small && styles.btnSmall,
      (pressed || disabled) && { opacity: 0.6 },
      style,
    ]}
  >
    <Text
      style={[
        styles.btnText,
        small && { fontSize: 14 },
        kind === 'danger' && { color: C.danger },
        kind === 'ghost' && { color: C.accent },
      ]}
    >
      {title}
    </Text>
  </Pressable>
);

const Card = ({ children, onPress, style }) =>
  onPress ? (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && { opacity: 0.8 }, style]}>
      {children}
    </Pressable>
  ) : (
    <View style={[styles.card, style]}>{children}</View>
  );

const Header = ({ title, onBack, right }) => (
  <View style={styles.header}>
    <View style={{ width: 70 }}>
      {onBack ? (
        <Pressable onPress={onBack} hitSlop={12}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
      ) : null}
    </View>
    <Text style={styles.headerTitle} numberOfLines={1}>
      {title}
    </Text>
    <View style={{ width: 70, alignItems: 'flex-end' }}>{right}</View>
  </View>
);

const Field = ({ label, ...props }) => (
  <View style={{ marginBottom: 12 }}>
    {label ? <Text style={styles.label}>{label}</Text> : null}
    <TextInput placeholderTextColor={C.muted} style={styles.input} {...props} />
  </View>
);

const Empty = ({ text }) => <Text style={[styles.muted, { textAlign: 'center', marginVertical: 24 }]}>{text}</Text>;

// ---------- screens ----------
function Welcome({ data, go }) {
  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <Text style={styles.brand}>STRENGTH</Text>
      <Text style={[styles.brand, { color: C.accent, marginTop: -6 }]}>BY BRAM</Text>
      <Text style={[styles.muted, { marginTop: 8, marginBottom: 32 }]}>Train smarter. Log every rep.</Text>

      <Text style={styles.section}>I'm the coach</Text>
      <Card onPress={() => go({ name: 'coach' })}>
        <Text style={styles.cardTitle}>Coach dashboard</Text>
        <Text style={styles.muted}>Build programs and manage clients</Text>
      </Card>

      <Text style={[styles.section, { marginTop: 24 }]}>I'm a client</Text>
      {data.clients.length === 0 ? <Empty text="No clients yet — add one in the coach dashboard." /> : null}
      {data.clients.map((c) => (
        <Card key={c.id} onPress={() => go({ name: 'clientHome', clientId: c.id })}>
          <Text style={styles.cardTitle}>{c.name}</Text>
          <Text style={styles.muted}>{data.programs.find((p) => p.id === c.programId)?.name || 'No program assigned'}</Text>
        </Card>
      ))}
    </ScrollView>
  );
}

function CoachHome({ data, update, go, back }) {
  const [tab, setTab] = useState('clients');
  const [newClient, setNewClient] = useState('');

  const addClient = () => {
    const name = newClient.trim();
    if (!name) return;
    update((d) => ({ ...d, clients: [...d.clients, { id: uid(), name, programId: d.programs[0]?.id || null }] }));
    setNewClient('');
  };

  const addProgram = () => {
    const program = { id: uid(), name: 'New program', days: [{ id: uid(), name: 'Day 1', exercises: [] }] };
    update((d) => ({ ...d, programs: [...d.programs, program] }));
    go({ name: 'programEdit', programId: program.id });
  };

  return (
    <View style={{ flex: 1 }}>
      <Header title="Coach" onBack={back} />
      <View style={styles.tabs}>
        {['clients', 'programs'].map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} style={[styles.tab, tab === t && styles.tabActive]}>
            <Text style={[styles.tabText, tab === t && { color: C.text }]}>{t === 'clients' ? 'Clients' : 'Programs'}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
        {tab === 'clients' ? (
          <>
            <View style={styles.row}>
              <TextInput
                value={newClient}
                onChangeText={setNewClient}
                placeholder="New client name"
                placeholderTextColor={C.muted}
                style={[styles.input, { flex: 1, marginRight: 8 }]}
                onSubmitEditing={addClient}
              />
              <Btn title="Add" onPress={addClient} small />
            </View>
            {data.clients.length === 0 ? <Empty text="No clients yet." /> : null}
            {data.clients.map((c) => {
              const count = data.workouts.filter((w) => w.clientId === c.id).length;
              return (
                <Card key={c.id} onPress={() => go({ name: 'coachClient', clientId: c.id })}>
                  <Text style={styles.cardTitle}>{c.name}</Text>
                  <Text style={styles.muted}>
                    {data.programs.find((p) => p.id === c.programId)?.name || 'No program'} · {count} workout{count === 1 ? '' : 's'}
                  </Text>
                </Card>
              );
            })}
          </>
        ) : (
          <>
            <Btn title="+ New program" onPress={addProgram} style={{ marginBottom: 16 }} />
            {data.programs.length === 0 ? <Empty text="No programs yet." /> : null}
            {data.programs.map((p) => (
              <Card key={p.id} onPress={() => go({ name: 'programEdit', programId: p.id })}>
                <Text style={styles.cardTitle}>{p.name}</Text>
                <Text style={styles.muted}>
                  {p.days.length} day{p.days.length === 1 ? '' : 's'} · {p.days.reduce((n, d) => n + d.exercises.length, 0)} exercises
                </Text>
              </Card>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function CoachClient({ data, update, clientId, go, back }) {
  const client = data.clients.find((c) => c.id === clientId);
  if (!client) return <Header title="Client not found" onBack={back} />;
  const workouts = data.workouts.filter((w) => w.clientId === clientId).sort((a, b) => b.date.localeCompare(a.date));

  const assign = (programId) =>
    update((d) => ({ ...d, clients: d.clients.map((c) => (c.id === clientId ? { ...c, programId } : c)) }));

  const remove = () =>
    confirm('Remove client?', `${client.name} and their workout history will be deleted.`, () => {
      update((d) => ({
        ...d,
        clients: d.clients.filter((c) => c.id !== clientId),
        workouts: d.workouts.filter((w) => w.clientId !== clientId),
      }));
      back();
    });

  return (
    <View style={{ flex: 1 }}>
      <Header title={client.name} onBack={back} />
      <ScrollView contentContainerStyle={styles.screen}>
        <Text style={styles.section}>Assigned program</Text>
        {data.programs.map((p) => (
          <Card key={p.id} onPress={() => assign(p.id)} style={client.programId === p.id && { borderColor: C.accent }}>
            <Text style={styles.cardTitle}>
              {client.programId === p.id ? '● ' : '○ '}
              {p.name}
            </Text>
          </Card>
        ))}

        <Text style={[styles.section, { marginTop: 24 }]}>Workout history</Text>
        {workouts.length === 0 ? <Empty text="No workouts logged yet." /> : null}
        {workouts.map((w) => (
          <WorkoutSummary key={w.id} workout={w} onPress={() => go({ name: 'workoutView', workoutId: w.id })} />
        ))}

        <Btn title="Remove client" kind="danger" onPress={remove} style={{ marginTop: 32 }} />
      </ScrollView>
    </View>
  );
}

function ProgramEdit({ data, update, programId, back }) {
  const program = data.programs.find((p) => p.id === programId);
  if (!program) return <Header title="Program not found" onBack={back} />;

  const setProgram = (fn) =>
    update((d) => ({ ...d, programs: d.programs.map((p) => (p.id === programId ? fn(p) : p)) }));
  const setDay = (dayId, fn) => setProgram((p) => ({ ...p, days: p.days.map((d) => (d.id === dayId ? fn(d) : d)) }));
  const setExercise = (dayId, exId, patch) =>
    setDay(dayId, (d) => ({ ...d, exercises: d.exercises.map((e) => (e.id === exId ? { ...e, ...patch } : e)) }));

  const addDay = () =>
    setProgram((p) => ({ ...p, days: [...p.days, { id: uid(), name: `Day ${p.days.length + 1}`, exercises: [] }] }));
  const addExercise = (dayId) =>
    setDay(dayId, (d) => ({ ...d, exercises: [...d.exercises, { id: uid(), name: '', sets: 3, reps: '8-12', notes: '' }] }));
  const moveExercise = (dayId, index, dir) =>
    setDay(dayId, (d) => {
      const list = [...d.exercises];
      const j = index + dir;
      if (j < 0 || j >= list.length) return d;
      [list[index], list[j]] = [list[j], list[index]];
      return { ...d, exercises: list };
    });

  const deleteProgram = () =>
    confirm('Delete program?', `"${program.name}" will be removed. Clients on it will have no program.`, () => {
      update((d) => ({
        ...d,
        programs: d.programs.filter((p) => p.id !== programId),
        clients: d.clients.map((c) => (c.programId === programId ? { ...c, programId: null } : c)),
      }));
      back();
    });

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Header title="Edit program" onBack={back} />
      <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
        <Field label="Program name" value={program.name} onChangeText={(name) => setProgram((p) => ({ ...p, name }))} />

        {program.days.map((day) => (
          <Card key={day.id} style={{ padding: 12 }}>
            <View style={styles.row}>
              <TextInput
                value={day.name}
                onChangeText={(name) => setDay(day.id, (d) => ({ ...d, name }))}
                style={[styles.input, styles.dayInput, { flex: 1 }]}
                placeholder="Day name"
                placeholderTextColor={C.muted}
              />
              <Pressable
                hitSlop={10}
                onPress={() =>
                  confirm('Delete day?', `Remove "${day.name}" and its exercises?`, () =>
                    setProgram((p) => ({ ...p, days: p.days.filter((d) => d.id !== day.id) })),
                  )
                }
              >
                <Text style={[styles.iconBtn, { color: C.danger }]}>✕</Text>
              </Pressable>
            </View>

            {day.exercises.map((e, i) => (
              <View key={e.id} style={styles.exEdit}>
                <View style={styles.row}>
                  <TextInput
                    value={e.name}
                    onChangeText={(name) => setExercise(day.id, e.id, { name })}
                    placeholder="Exercise name"
                    placeholderTextColor={C.muted}
                    style={[styles.input, { flex: 1 }]}
                  />
                  <Pressable hitSlop={6} onPress={() => moveExercise(day.id, i, -1)}>
                    <Text style={styles.iconBtn}>↑</Text>
                  </Pressable>
                  <Pressable hitSlop={6} onPress={() => moveExercise(day.id, i, 1)}>
                    <Text style={styles.iconBtn}>↓</Text>
                  </Pressable>
                  <Pressable
                    hitSlop={6}
                    onPress={() => setDay(day.id, (d) => ({ ...d, exercises: d.exercises.filter((x) => x.id !== e.id) }))}
                  >
                    <Text style={[styles.iconBtn, { color: C.danger }]}>✕</Text>
                  </Pressable>
                </View>
                <View style={[styles.row, { marginTop: 8 }]}>
                  <Text style={styles.smallLabel}>Sets</Text>
                  <TextInput
                    value={String(e.sets)}
                    onChangeText={(t) => setExercise(day.id, e.id, { sets: Math.max(1, Math.min(10, parseInt(t, 10) || 1)) })}
                    keyboardType="number-pad"
                    style={[styles.input, styles.smallInput]}
                  />
                  <Text style={styles.smallLabel}>Reps</Text>
                  <TextInput
                    value={e.reps}
                    onChangeText={(reps) => setExercise(day.id, e.id, { reps })}
                    style={[styles.input, styles.smallInput, { width: 90 }]}
                  />
                </View>
                <TextInput
                  value={e.notes}
                  onChangeText={(notes) => setExercise(day.id, e.id, { notes })}
                  placeholder="Coaching notes (optional)"
                  placeholderTextColor={C.muted}
                  style={[styles.input, { marginTop: 8, fontSize: 14 }]}
                />
              </View>
            ))}
            <Btn title="+ Add exercise" kind="ghost" small onPress={() => addExercise(day.id)} />
          </Card>
        ))}

        <Btn title="+ Add day" kind="secondary" onPress={addDay} />
        <Btn title="Delete program" kind="danger" onPress={deleteProgram} style={{ marginTop: 32 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function ClientHome({ data, clientId, go, back }) {
  const client = data.clients.find((c) => c.id === clientId);
  const program = data.programs.find((p) => p.id === client?.programId);
  const workouts = useMemo(
    () => data.workouts.filter((w) => w.clientId === clientId).sort((a, b) => b.date.localeCompare(a.date)),
    [data.workouts, clientId],
  );
  if (!client) return <Header title="Client not found" onBack={back} />;

  // Next session = the day after the last one completed on this program.
  let nextDay = program?.days[0];
  if (program && program.days.length) {
    const last = workouts.find((w) => w.programId === program.id);
    const idx = last ? program.days.findIndex((d) => d.id === last.dayId) : -1;
    nextDay = program.days[(idx + 1) % program.days.length];
  }

  const thisWeek = workouts.filter((w) => Date.now() - new Date(w.date).getTime() < 7 * 864e5).length;

  return (
    <View style={{ flex: 1 }}>
      <Header title={`Hi, ${client.name.split(' ')[0]}`} onBack={back} />
      <ScrollView contentContainerStyle={styles.screen}>
        <View style={[styles.row, { marginBottom: 16 }]}>
          <View style={[styles.stat, { marginRight: 8 }]}>
            <Text style={styles.statNum}>{thisWeek}</Text>
            <Text style={styles.muted}>this week</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNum}>{workouts.length}</Text>
            <Text style={styles.muted}>total workouts</Text>
          </View>
        </View>

        {!program ? (
          <Empty text="Your coach hasn't assigned a program yet." />
        ) : (
          <>
            {nextDay ? (
              <Card style={{ borderColor: C.accent, backgroundColor: C.accentDim }}>
                <Text style={[styles.label, { color: C.accent }]}>UP NEXT</Text>
                <Text style={styles.cardTitle}>{nextDay.name}</Text>
                <Text style={[styles.muted, { marginBottom: 12 }]}>{nextDay.exercises.map((e) => e.name).filter(Boolean).join(' · ')}</Text>
                <Btn title="Start workout" onPress={() => go({ name: 'log', clientId, dayId: nextDay.id })} />
              </Card>
            ) : null}

            <Text style={[styles.section, { marginTop: 16 }]}>{program.name}</Text>
            {program.days.map((d) => (
              <Card key={d.id} onPress={() => go({ name: 'log', clientId, dayId: d.id })}>
                <Text style={styles.cardTitle}>{d.name}</Text>
                <Text style={styles.muted}>{d.exercises.length} exercises · tap to start</Text>
              </Card>
            ))}
          </>
        )}

        <Text style={[styles.section, { marginTop: 24 }]}>History</Text>
        {workouts.length === 0 ? <Empty text="No workouts yet — your first one is waiting." /> : null}
        {workouts.map((w) => (
          <WorkoutSummary key={w.id} workout={w} onPress={() => go({ name: 'workoutView', workoutId: w.id })} />
        ))}
      </ScrollView>
    </View>
  );
}

// Finds what the client lifted last time for this exercise, to pre-fill and show as a target.
function lastPerformance(workouts, clientId, exerciseName) {
  const key = exerciseName.trim().toLowerCase();
  const sorted = workouts.filter((w) => w.clientId === clientId).sort((a, b) => b.date.localeCompare(a.date));
  for (const w of sorted) {
    const ex = w.exercises.find((e) => e.name.trim().toLowerCase() === key);
    if (ex && ex.sets.some((s) => s.done)) return ex.sets.filter((s) => s.done);
  }
  return null;
}

function LogWorkout({ data, update, clientId, dayId, back, go }) {
  const client = data.clients.find((c) => c.id === clientId);
  const program = data.programs.find((p) => p.id === client?.programId);
  const day = program?.days.find((d) => d.id === dayId);

  const [entries, setEntries] = useState(() =>
    (day?.exercises || []).map((e) => {
      const prev = lastPerformance(data.workouts, clientId, e.name);
      return {
        exerciseId: e.id,
        name: e.name || 'Exercise',
        target: `${e.sets} × ${e.reps}`,
        notes: e.notes,
        previous: prev ? prev.map((s) => `${s.weight || 0}×${s.reps || 0}`).join(', ') : null,
        sets: Array.from({ length: e.sets }, (_, i) => ({
          weight: prev?.[i]?.weight ?? prev?.[prev.length - 1]?.weight ?? '',
          reps: '',
          done: false,
        })),
      };
    }),
  );
  const [startedAt] = useState(() => new Date().toISOString());
  const [comment, setComment] = useState('');

  if (!day) return <Header title="Session not found" onBack={back} />;

  const setSet = (ei, si, patch) =>
    setEntries((list) => list.map((e, i) => (i !== ei ? e : { ...e, sets: e.sets.map((s, j) => (j === si ? { ...s, ...patch } : s)) })));
  const addSet = (ei) =>
    setEntries((list) =>
      list.map((e, i) => (i !== ei ? e : { ...e, sets: [...e.sets, { weight: e.sets[e.sets.length - 1]?.weight ?? '', reps: '', done: false }] })),
    );

  const doneCount = entries.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0);
  const totalCount = entries.reduce((n, e) => n + e.sets.length, 0);

  const finish = () => {
    if (doneCount === 0) {
      confirm('No sets ticked', 'Tick off the sets you completed before finishing. Leave without saving?', back);
      return;
    }
    const workout = {
      id: uid(),
      clientId,
      programId: program.id,
      dayId: day.id,
      dayName: day.name,
      date: startedAt,
      finishedAt: new Date().toISOString(),
      comment: comment.trim(),
      exercises: entries.map((e) => ({ name: e.name, sets: e.sets })),
    };
    update((d) => ({ ...d, workouts: [...d.workouts, workout] }));
    go({ name: 'workoutView', workoutId: workout.id, replace: true });
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Header
        title={day.name}
        onBack={() => confirm('Leave workout?', 'Sets you entered will not be saved.', back)}
        right={<Text style={styles.muted}>{doneCount}/{totalCount}</Text>}
      />
      <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
        {entries.map((e, ei) => (
          <Card key={e.exerciseId}>
            <Text style={styles.cardTitle}>{e.name}</Text>
            <Text style={styles.muted}>Target {e.target}{e.previous ? `  ·  Last: ${e.previous}` : ''}</Text>
            {e.notes ? <Text style={[styles.muted, { fontStyle: 'italic', marginTop: 4 }]}>“{e.notes}”</Text> : null}

            <View style={[styles.row, { marginTop: 12, marginBottom: 4 }]}>
              <Text style={[styles.colHead, { width: 36 }]}>SET</Text>
              <Text style={[styles.colHead, { flex: 1, marginRight: 8, textAlign: 'center' }]}>KG</Text>
              <Text style={[styles.colHead, { flex: 1, marginRight: 8, textAlign: 'center' }]}>REPS</Text>
              <Text style={[styles.colHead, { width: 44, textAlign: 'center' }]}>✓</Text>
            </View>
            {e.sets.map((s, si) => (
              <View key={si} style={[styles.row, styles.setRow, s.done && { backgroundColor: '#183326' }]}>
                <Text style={[styles.setNum, { width: 36 }]}>{si + 1}</Text>
                <TextInput
                  value={String(s.weight)}
                  onChangeText={(weight) => setSet(ei, si, { weight: weight.replace(',', '.') })}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={C.muted}
                  style={[styles.input, styles.setInput]}
                />
                <TextInput
                  value={String(s.reps)}
                  onChangeText={(reps) => setSet(ei, si, { reps })}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor={C.muted}
                  style={[styles.input, styles.setInput]}
                />
                <Pressable
                  onPress={() => setSet(ei, si, { done: !s.done })}
                  style={[styles.check, s.done && { backgroundColor: C.good, borderColor: C.good }]}
                  hitSlop={6}
                >
                  <Text style={{ color: s.done ? '#0B1A12' : C.muted, fontWeight: '800' }}>✓</Text>
                </Pressable>
              </View>
            ))}
            <Btn title="+ Add set" kind="ghost" small onPress={() => addSet(ei)} />
          </Card>
        ))}

        <Field label="How did it feel? (optional)" value={comment} onChangeText={setComment} placeholder="e.g. Squats felt heavy, left knee fine" multiline />
        <Btn title="Finish workout" onPress={finish} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function WorkoutSummary({ workout, onPress }) {
  const sets = workout.exercises.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0);
  const volume = workout.exercises.reduce(
    (n, e) => n + e.sets.filter((s) => s.done).reduce((m, s) => m + (parseFloat(s.weight) || 0) * (parseInt(s.reps, 10) || 0), 0),
    0,
  );
  return (
    <Card onPress={onPress}>
      <Text style={styles.cardTitle}>{workout.dayName}</Text>
      <Text style={styles.muted}>
        {formatDate(workout.date)} · {sets} sets · {Math.round(volume).toLocaleString()} kg volume
      </Text>
    </Card>
  );
}

function WorkoutView({ data, update, workoutId, back }) {
  const w = data.workouts.find((x) => x.id === workoutId);
  if (!w) return <Header title="Workout" onBack={back} />;
  const client = data.clients.find((c) => c.id === w.clientId);
  const minutes = w.finishedAt ? Math.max(1, Math.round((new Date(w.finishedAt) - new Date(w.date)) / 60000)) : null;

  const remove = () =>
    confirm('Delete workout?', 'This logged session will be removed.', () => {
      update((d) => ({ ...d, workouts: d.workouts.filter((x) => x.id !== workoutId) }));
      back();
    });

  return (
    <View style={{ flex: 1 }}>
      <Header title={w.dayName} onBack={back} />
      <ScrollView contentContainerStyle={styles.screen}>
        <Text style={styles.muted}>
          {client?.name} · {formatDate(w.date)}
          {minutes ? ` · ${minutes} min` : ''}
        </Text>
        {w.comment ? <Text style={[styles.text, { marginTop: 8, fontStyle: 'italic' }]}>“{w.comment}”</Text> : null}
        <View style={{ height: 16 }} />
        {w.exercises.map((e, i) => {
          const done = e.sets.filter((s) => s.done);
          return (
            <Card key={i}>
              <Text style={styles.cardTitle}>{e.name}</Text>
              {done.length === 0 ? <Text style={styles.muted}>Skipped</Text> : null}
              {done.map((s, j) => (
                <Text key={j} style={styles.text}>
                  Set {j + 1}: {s.weight || 0} kg × {s.reps || 0}
                </Text>
              ))}
            </Card>
          );
        })}
        <Btn title="Delete workout" kind="danger" onPress={remove} style={{ marginTop: 24 }} />
      </ScrollView>
    </View>
  );
}

// ---------- app shell ----------
export default function App() {
  const [data, setData] = useState(null);
  const [stack, setStack] = useState([{ name: 'welcome' }]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => setData(raw ? JSON.parse(raw) : seedData()))
      .catch(() => setData(seedData()));
  }, []);

  useEffect(() => {
    if (data) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)).catch(() => {});
  }, [data]);

  const update = (fn) => setData((d) => fn(d));
  const go = (screen) => setStack((s) => (screen.replace ? [...s.slice(0, -1), screen] : [...s, screen]));
  const back = () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));

  const current = stack[stack.length - 1];
  const props = { data, update, go, back, ...current };

  let content = null;
  if (!data) content = <Text style={[styles.muted, { margin: 24 }]}>Loading…</Text>;
  else if (current.name === 'welcome') content = <Welcome {...props} />;
  else if (current.name === 'coach') content = <CoachHome {...props} />;
  else if (current.name === 'coachClient') content = <CoachClient {...props} />;
  else if (current.name === 'programEdit') content = <ProgramEdit {...props} />;
  else if (current.name === 'clientHome') content = <ClientHome {...props} />;
  else if (current.name === 'log') content = <LogWorkout key={`${current.clientId}-${current.dayId}`} {...props} />;
  else if (current.name === 'workoutView') content = <WorkoutView {...props} />;

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
        <StatusBar style="light" />
        {content}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

// ---------- styles ----------
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  screen: { padding: 16, paddingBottom: 48 },
  brand: { color: C.text, fontSize: 40, fontWeight: '900', letterSpacing: 2, marginTop: 24 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerTitle: { color: C.text, fontSize: 18, fontWeight: '700', flex: 1, textAlign: 'center' },
  back: { color: C.accent, fontSize: 17 },
  tabs: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 12 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: C.accent },
  tabText: { color: C.muted, fontSize: 16, fontWeight: '600' },
  section: { color: C.muted, fontSize: 13, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 },
  card: { backgroundColor: C.card, borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: C.border },
  cardTitle: { color: C.text, fontSize: 17, fontWeight: '700', marginBottom: 2 },
  text: { color: C.text, fontSize: 15, marginTop: 4 },
  muted: { color: C.muted, fontSize: 14 },
  label: { color: C.muted, fontSize: 13, fontWeight: '600', marginBottom: 6 },
  input: {
    backgroundColor: C.cardAlt,
    color: C.text,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    fontSize: 16,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  btn: { borderRadius: 12, paddingVertical: 14, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  btnSmall: { paddingVertical: 10, paddingHorizontal: 14 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  dayInput: { fontSize: 17, fontWeight: '700', marginRight: 8 },
  exEdit: { borderTopWidth: 1, borderTopColor: C.border, paddingTop: 12, marginTop: 12 },
  iconBtn: { color: C.muted, fontSize: 18, paddingHorizontal: 8 },
  smallLabel: { color: C.muted, marginRight: 6, marginLeft: 4 },
  smallInput: { width: 56, textAlign: 'center', marginRight: 8 },
  stat: { flex: 1, backgroundColor: C.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: C.border },
  statNum: { color: C.text, fontSize: 28, fontWeight: '800' },
  colHead: { color: C.muted, fontSize: 12, fontWeight: '700' },
  setRow: { borderRadius: 8, paddingVertical: 4, marginBottom: 4 },
  setNum: { color: C.muted, fontSize: 16, fontWeight: '700', textAlign: 'center' },
  setInput: { flex: 1, marginRight: 8, textAlign: 'center', paddingVertical: 8 },
  check: {
    width: 44,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
