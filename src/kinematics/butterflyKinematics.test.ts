import test from 'node:test';
import assert from 'node:assert/strict';
import {
  advancePhase,
  computeWingKinematics,
  dampValue,
  clampAngleDeg,
  wrapYawDeg,
  DEFAULT_CONTROL_STATE,
  FLIGHT_PRESETS,
} from './butterflyKinematics';

test('advancePhase advances proportionally to flapSpeed and pauses cleanly', () => {
  const p0 = 1.25;
  // When paused, phase does not change
  assert.equal(advancePhase(p0, 0.016, 1.5, false), p0);
  // When flapSpeed is 0, phase does not change
  assert.equal(advancePhase(p0, 0.016, 0, true), p0);

  // Normal speed vs double speed
  const p1 = advancePhase(0, 0.1, 1.0, true);
  const p2 = advancePhase(0, 0.1, 2.0, true);
  assert.ok(p1 > 0, 'phase should increase when playing');
  assert.ok(Math.abs(p2 - p1 * 2) < 1e-6, 'double speed should advance twice as fast');
});

test('computeWingKinematics produces phase-lagged forewing and hindwing motion', () => {
  const poseAtZero = computeWingKinematics(0, DEFAULT_CONTROL_STATE);
  const poseAtPeak = computeWingKinematics(Math.PI / 2, DEFAULT_CONTROL_STATE);

  // At phase = PI/2, forewing is near top of upstroke
  assert.ok(poseAtPeak.forewingFlapRad > 0.4, 'forewing should elevate on upstroke');
  // Because of phaseLag > 0, hindwing trails forewing at phase = 0
  assert.notEqual(
    poseAtZero.forewingFlapRad,
    poseAtZero.hindwingFlapRad,
    'hindwing should have phase lag relative to forewing'
  );
  assert.ok(poseAtPeak.telemetry.frequencyHz > 0);
  assert.ok(poseAtPeak.telemetry.wingtipVelocityMs > 0);
});

test('morphExpansion increases armorPlateSlide and plasma output', () => {
  const closedPose = computeWingKinematics(0, {
    ...DEFAULT_CONTROL_STATE,
    morphExpansion: 0,
  });
  const expandedPose = computeWingKinematics(0, {
    ...DEFAULT_CONTROL_STATE,
    morphExpansion: 1.0,
  });

  assert.ok(
    expandedPose.armorPlateSlide > closedPose.armorPlateSlide + 0.7,
    'armorPlateSlide should expand when morphExpansion is 1.0'
  );
  assert.ok(
    expandedPose.tailCaliperSpreadRad > closedPose.tailCaliperSpreadRad,
    'tailCaliperSpreadRad should widen when morphExpansion increases'
  );
  assert.ok(
    expandedPose.gearRotationRad > closedPose.gearRotationRad,
    'gearRotationRad should advance during morph expansion'
  );
  assert.ok(
    expandedPose.telemetry.plasmaOutputMw > closedPose.telemetry.plasmaOutputMw,
    'plasma output telemetry should increase during morph expansion'
  );
});

test('dampValue and angle helpers bound and interpolate properly', () => {
  const damped = dampValue(0, 100, 10, 0.05);
  assert.ok(damped > 0 && damped < 100, 'dampValue should move smoothly toward target');
  assert.equal(clampAngleDeg(140, -90, 90), 90);
  assert.equal(clampAngleDeg(-120, -90, 90), -90);
  assert.equal(wrapYawDeg(190), -170);
  assert.equal(wrapYawDeg(-190), 170);
  assert.ok(FLIGHT_PRESETS.hypermorph.flapSpeed > FLIGHT_PRESETS.hover.flapSpeed);
});
