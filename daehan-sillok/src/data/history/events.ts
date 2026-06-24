// Dynamic helper to create mock coordinates and events for each book
export const createMockEvents = (bookTitle: string, index: number) => {
  const baseYear = 1400 + (index * 13) % 450;
  return [
    {
      id: `evt-${index}-1`,
      title: `${bookTitle} 주관사 사건기`,
      year: baseYear,
      dateStr: `서기 ${baseYear}년 가을`,
      mapX: 30 + (index * 7) % 50,
      mapY: 25 + (index * 11) % 55,
      locationName: "한성부 돈화문 정동",
      description: `본 기록은 ${bookTitle}에 수록된 일지로서, 국왕과 신료들이 당시 국정에 대하여 깊이있게 의논하고 결의한 주요일 사안이옵니다. 민본 사상을 기저에 둔 치밀한 기록입니다.`,
      details: [
        `조정 관원들의 대대적인 인사 교류 및 품계 서열 조정`,
        `경내 농지 가뭄 완화를 위한 수로 복구와 관개 시설 증축 지시`,
        `국경 검문소의 경비를 대대적으로 강화하고 봉수대를 정비함`,
        `학림 관원들의 도학적 고찰과 대제학 보고서 검독 완료`
      ],
      category: "정치" as const,
      iconName: "crown" as const
    }
  ];
};