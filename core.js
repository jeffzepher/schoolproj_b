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
  function defaultStudents(){
    return [
      ['01','陈伯渊'],['02','陈画'],['03','陈锦乐'],['04','陈芊语'],['05','陈奕彤'],
      ['07','董晴朗'],['08','樊雅琦'],['09','范永晖'],['10','胡承函'],['11','黄瀚瑶'],
      ['12','黄奕铭'],['13','李芯宇'],['14','廖凌菲'],['16','录泊澐'],['17','罗家栋'],
      ['18','蒙晓娜'],['19','孟凡宸'],['20','潘依伊'],['21','彭译明'],['22','粟子轩'],
      ['23','童睿深'],['24','王傲然'],['25','王祥鑫'],['26','魏晓晓'],['27','温桂祺'],
      ['28','严槿'],['29','张馨月'],['30','赵依晨'],['31','郑睿宸'],['32','卓修齐'],
      ['33','赵佳琪'],['34','安家宣'],['35','房泽羽'],['36','章垲阳']
    ].map(([no,name])=>({id:'default-'+no,no,name}));
  }
  function applyDefaultStudents(state){
    const key=no=>/^\d+$/.test(no)?String(Number(no)):no;
    const next=state.students.map(s=>({...s})),byNo=new Map();
    for(const student of next){const no=key(student.no);if(byNo.has(no))throw Error('学号 '+no+' 存在重复（如 1 与 01），请先整理名单或恢复正确备份');byNo.set(no,student)}
    for(const student of defaultStudents()){
      const existing=byNo.get(key(student.no));
      if(existing){existing.name=student.name;existing.no=student.no}
      else{let id=student.id;while(next.some(s=>s.id===id))id+='-new';next.push({...student,id})}
    }
    if(next.length>500)throw Error('应用后名单超过 500 位，请先整理名单');
    state.students=next;
  }
  const api={homeLists,renameStudent,defaultStudents,applyDefaultStudents};
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.ClassStarsCore=api;
})(typeof window!=='undefined'?window:globalThis);
