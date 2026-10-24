(function(root){
  'use strict';
  function homeLists(rows,hasRecords){
    const sorted=rows.slice().sort((a,b)=>b.total-a.total||a.no.localeCompare(b.no,'zh-CN',{numeric:true}));
    let previous=null,rank=0;
    const ranked=sorted.map((s,i)=>{if(s.total!==previous)rank=i+1;previous=s.total;return {...s,rank}});
    return {top:hasRecords?ranked.filter(s=>s.rank<=10):[],negative:ranked.filter(s=>s.total<0).sort((a,b)=>a.total-b.total||a.no.localeCompare(b.no,'zh-CN',{numeric:true}))};
  }
  function renameStudent(state,id,name){
    const trimmed=String(name).trim();
    if(!trimmed||trimmed.length>30)throw Error('姓名需为 1–30 个字，不能只填空格');
    const student=state.students.find(s=>s.id===id);
    if(!student)throw Error('未找到这位学生，请重新选择');
    student.name=trimmed;
    return student;
  }
  const api={homeLists,renameStudent};
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.ClassStarsCore=api;
})(typeof window!=='undefined'?window:globalThis);
