
const THREE = window.MINDAR.IMAGE.THREE;

// ─────────────────────────────────────────
// 갤러리 / 이미지 선택 로직
// ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {

  const fileInput    = document.getElementById('file-input');
  const previewGrid  = document.getElementById('preview-grid');
  const startArBtn   = document.getElementById('start-ar-btn');
  const galleryScreen = document.getElementById('gallery-screen');

  let selectedImageUrl = null; // 최종 선택된 이미지 URL (Object URL)

  // 1) 파일 업로드 → 미리보기 그리드에 추가
  fileInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const url = URL.createObjectURL(file);

      const img = document.createElement('img');
      img.src = url;
      img.className = 'preview-item';
      img.title = file.name;

      // 2) 미리보기 클릭 → 선택 처리
      img.addEventListener('click', () => {
        // 기존 선택 해제
        document.querySelectorAll('.preview-item').forEach(el => el.classList.remove('selected'));
        img.classList.add('selected');

        selectedImageUrl = url;
        startArBtn.style.display = 'inline-block'; // AR 시작 버튼 표시
      });

      previewGrid.appendChild(img);
    });

    // input 초기화 → 같은 파일 재업로드 가능
    fileInput.value = '';
  });

  // 3) AR 시작 버튼 클릭 → 갤러리 화면 숨기고 AR 실행
  startArBtn.addEventListener('click', () => {
    if (!selectedImageUrl) return;
    galleryScreen.style.display = 'none';
    startAR(selectedImageUrl);
  });
});


// ─────────────────────────────────────────
// AR 실행 로직 (기존 코드 유지, 이미지 URL만 인자로 받음)
// ─────────────────────────────────────────
const startAR = async (imageUrl) => {
  const mindarThree = new window.MINDAR.IMAGE.MindARThree({
    container: document.body,
    imageTargetSrc: './targets.mind',
    video: {
      facingMode: 'environment', // 후면 카메라
      width:  { ideal: 640 },
      height: { ideal: 480 },
    },
    // ── 떨림 방지 필터 (One Euro Filter) ────────────────
    // filterMinCF: 낮을수록 떨림이 줄어듦 (너무 낮으면 반응이 느려짐)
    // filterBeta:  낮을수록 움직임이 부드러워짐 (너무 낮으면 따라오는 속도가 느려짐)
    filterMinCF: 0.0001,
    filterBeta: 0.001,
    // ────────────────────────────────────────────────────
  });

  const { renderer, scene, camera } = mindarThree;

  // 선택한 이미지로 텍스처 생성
  const loader = new THREE.TextureLoader();
  const texture = loader.load(imageUrl);

  const planeW = 1;
  const planeH = 1;
  const geometry = new THREE.PlaneGeometry(planeW, planeH);

  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
  });
  const plane = new THREE.Mesh(geometry, material);

  // ── 위치 조정 ───────────────────────────────────────────────────────────
  // MindAR 좌표계: 타겟 중앙 = (0, 0), 타겟 너비/높이 = 1.0
  // PlaneGeometry 중심 = plane.position 값
  //
  //   (0.0,  0.0) → 오버레이 중심 = 타겟 중앙        (기본값)
  //   (-0.5, -0.5) → 오버레이 왼쪽 하단 = 타겟 왼쪽 하단 ✅
  //   ( 0.5,  0.5) → 오버레이 오른쪽 상단 = 타겟 오른쪽 상단
  // ────────────────────────────────────────────────────────────────────────
  plane.position.set(0, 0.25, 0); // ← 이 값만 바꾸면 위치 조정 가능

  const anchor = mindarThree.addAnchor(0);
  anchor.group.add(plane);

  await mindarThree.start();

  // ── 뒤로가기 버튼 추가 ──
  const backBtn = document.createElement('button');
  backBtn.textContent = '← 이미지 다시 선택';
  Object.assign(backBtn.style, {
    position: 'fixed',
    top: '16px',
    left: '16px',
    zIndex: '9999',
    padding: '10px 20px',
    background: 'rgba(0,0,0,0.6)',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.4)',
    borderRadius: '8px',
    fontSize: '0.95rem',
    cursor: 'pointer',
  });
  document.body.appendChild(backBtn);

  backBtn.addEventListener('click', () => {
    // AR 종료
    renderer.setAnimationLoop(null);
    mindarThree.stop();
    mindarThree.renderer.domElement.remove(); // AR 캔버스 제거
    backBtn.remove();                         // 버튼 제거

    // 갤러리 화면 다시 표시
    document.getElementById('gallery-screen').style.display = 'flex';
  });
  // ──────────────────────

  renderer.setAnimationLoop(() => {
    renderer.render(scene, camera);
  });
};
