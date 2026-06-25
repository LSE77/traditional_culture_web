export const CLASSIC_COLLECTIONS = [
  {
    id: "joseon-sillok",
    label: "조선왕조실록",
    itemId: "JT",
    defaultSecId: "JT_BD",
    titleSecId: "JT_GS",
    bodySecId: "JT_BD",
    browseType: "king-date",

  },
  {
    id: "seungjeongwon-ilgi",
    label: "승정원일기",
    itemId: "SJ",
    defaultSecId: "",
    titleSecId: "",
    bodySecId: "",
    browseType: "date",
  },
  {
    id: "ilseongnok",
    label: "일성록",
    itemId: "IL",
    defaultSecId: "",
    titleSecId: "",
    bodySecId: "",
    browseType: "date",
  },
  {
    id: "literary-collections",
    label: "문집류",
    itemId: "",
    defaultSecId: "",
    titleSecId: "",
    bodySecId: "",
    browseType: "book-volume-title",
  },
] as const;


// 승정원/일성록/ 등등 다른 것들 형식은 나중에 고쳐야 함