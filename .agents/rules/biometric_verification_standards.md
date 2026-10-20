# 🛡️ Biometric & Computer Vision Verification Standards

## Invariants & Guardrails
1. **Zero Mock Biometrics**: Never use random numbers, character hash math, or artificial confidence floors (e.g. `0.70 + x`) for biometric authentication.
2. **Deep Neural Embeddings**: All biometric decisions must be driven by deep vector embeddings (e.g., 128-dimensional Float32 vectors from trained CNN architectures such as FaceNet / ResNet-34).
3. **Strict Euclidean Distance Rejection**: Impostor distance thresholds must be strictly enforced ($d \ge 0.48$ = Rejection). Different subjects, proxy attempts, or friends must fail immediately with HTTP 400 `FACE_MISMATCH`.
4. **Anti-Spoofing & Liveness**: High-security check-ins must incorporate active liveness checks (Eye Aspect Ratio verification or 3D depth contour checks) to prevent static photo or screen replay attacks.
5. **Multi-Model Support**: Pre-trained weights for heavy models (`ssd_mobilenetv1`, `face_landmark_68`, `face_recognition`, `face_expression`) must be served locally from `/models` with offline-capable browser caching.
