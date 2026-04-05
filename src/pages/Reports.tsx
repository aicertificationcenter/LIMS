

export const Reports = () => {
  return (
    <main className="dashboard-grid animate-fade-in">
      <section className="card" style={{ gridColumn: '1 / -1' }}>
        <h2 className="card-title">성적서 발행 연동 (임시 페이지)</h2>
        <p style={{ color: '#64748b' }}>이곳에서 KOLAS 위변조 방지 양식이 적용된 성적서를 조회하고 PDF로 발행할 수 있습니다.</p>
        <button className="btn btn-primary" style={{ marginTop: '1.5rem', opacity: 0.5, cursor: 'not-allowed' }}>
          위변조 방지 성적서 테스트 생성하기 (구현 예정)
        </button>
      </section>
    </main>
  );
};
