const {test}=require('node:test');
const assert=require('node:assert/strict');
const H=require('./history-import.js');

const state={students:[{id:'s',no:'01',name:'测试学生'}],rules:[],records:[]};

test('第6周原表格式：只有三至五及展所长，按表头识别日期和加分',()=>{
  const plan=H.preview([
    ['学号','姓名','总分','三','四','五','展所长'],
    [1,'测试学生',2,'-1作','','','+1报+2作']
  ],state,6);
  assert.deepEqual(plan.errors,[]);
  assert.equal(plan.rows[0].computed,2);
  assert.deepEqual(plan.records.map(r=>[r.date,r.points,r.short,r.datePrecision]),[
    ['2026-10-07',-1,'作','day'],
    ['2026-10-11',1,'报','week'],
    ['2026-10-11',2,'作','week']
  ]);
});

test('模板加入周一和周二后，明细按实际星期导入，仍核对总分',()=>{
  const headers=H.TEMPLATE_HEADERS.map(h=>h==='二'?'周二':h);
  const row=[1,'测试学生',1,'-1作','-2纪','','','','+4报'];
  const plan=H.preview([headers,row],state,6);
  assert.deepEqual(plan.errors,[]);
  assert.deepEqual(plan.records.map(r=>r.date),['2026-10-05','2026-10-06','2026-10-11']);
  row[2]=9;
  assert.throws(()=>H.merge(state,H.preview([headers,row],state,6),false),/修正预览/);
});
