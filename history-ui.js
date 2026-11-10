'use strict';
let historyWorkbook=null,historyGrid=[],historySource='',historyIssues=[],historyLoadToken=0,historyManualWeek=false;
function openHistoryImport(){
  historyLoadToken++;historyWorkbook=null;historyGrid=[];historySource='';historyIssues=[];historyManualWeek=false;
  for(const id of ['historyFile','historyPaste','historyWeekNumber','historyWeekDate','historyWeekEnd'])$(id).value='';
  $('historySheetWrap').hidden=true;$('historyNameAck').checked=false;$('historyNameWrap').hidden=true;
  $('historyDetection').textContent='第1周为 2026-08-31 — 2026-09-06；每周自动顺延七天。';
  updateHistoryPreview();$('historyImportDialog').showModal();
}
function chooseHistoryWeek(number){
  if(!number){$('historyWeekNumber').value='';$('historyWeekDate').value='';$('historyWeekEnd').value='';return}
  const info=ClassStarsHistory.period(Number(number));
  $('historyWeekNumber').value=String(info.number);$('historyWeekDate').value=info.start;$('historyWeekEnd').value=info.end;
}
function historyDateLabel(record){
  if(record.datePrecision==='week')return '本周（具体日期未注明）';
  if(record.datePrecision==='weekend')return '本周周末（具体日期未注明）';
  return record.date;
}
function currentHistoryPlan(){
  const value=$('historyWeekNumber').value;
  const plan=ClassStarsHistory.preview(historyGrid,state,value?Number(value):null);
  plan.errors.unshift(...historyIssues);return plan;
}
function updateHistoryPreview(){
  const button=$('historyCommitBtn');button.disabled=true;
  if(!historyGrid.length){$('historyNameWrap').hidden=true;$('historySummary').textContent='选择每周积分表或粘贴表格文字，再确认所属周。';$('historyPreview').innerHTML=historyIssues.map(message=>'<p class="history-error">'+esc(message)+'</p>').join('');return}
  const plan=currentHistoryPlan();
  $('historyNameWrap').hidden=!plan.nameConflicts.length;
  $('historySummary').textContent=(plan.period?'第'+plan.number+'周 · '+plan.period.start+' — '+plan.period.end+'；':'')+'识别 '+plan.rows.length+' 位学生，'+plan.records.length+' 条明细；将覆盖该周原有 '+(plan.replaced||0)+' 条记录。';
  const messages=plan.errors.slice(0,30).map(message=>'<p class="history-error">'+esc(message)+'</p>').join('')+(plan.errors.length>30?'<p>还有 '+(plan.errors.length-30)+' 处错误，请修正文件后再试。</p>':'');
  const warnings=plan.warnings.map(message=>'<p class="history-warning">'+esc(message)+'</p>').join('');
  const names=plan.nameConflicts.map(item=>'<li>'+esc(item.no+'号：表内「'+item.fileName+'」，现有名单「'+item.currentName+'」')+'</li>').join('');
  const table=plan.rows.length?'<div class="history-table"><table><thead><tr><th>学号</th><th>姓名</th><th>表内总分</th><th>解析合计</th><th>明细条数</th></tr></thead><tbody>'+plan.rows.map(row=>'<tr><td>'+esc(row.no)+'</td><td>'+esc(row.name)+'</td><td>'+row.expected+'</td><td>'+row.computed+'</td><td>'+row.count+'</td></tr>').join('')+'</tbody></table></div>':'';
  const detail=plan.records.length?'<details class="history-detail"><summary>查看解析明细（'+plan.records.length+' 条）</summary><div>'+plan.records.slice(0,200).map(record=>'<p>'+esc((state.students.find(s=>s.id===record.student)?.name||'')+' · '+historyDateLabel(record)+' · '+signed(record.points)+record.short)+'</p>').join('')+(plan.records.length>200?'<p>预览显示前 200 条，确认后导入全部已核对明细。</p>':'')+'</div></details>':'';
  $('historyPreview').innerHTML=messages+warnings+(names?'<div class="history-warning">姓名有差异，将按学号匹配并保留现有名单姓名：<ul>'+names+'</ul></div>':'')+table+detail;
  button.disabled=!!plan.errors.length||!plan.rows.length||!!plan.nameConflicts.length&&!$('historyNameAck').checked;
}
function setHistorySource(grid,source,issues=[]){
  historyGrid=grid;historyIssues=issues;$('historyNameAck').checked=false;
  const detected=ClassStarsHistory.detectPeriod(grid,source);
  $('historyDetection').textContent=detected.message+(historyManualWeek&&detected.number&&Number($('historyWeekNumber').value)!==detected.number?' 文件提示第'+detected.number+'周；当前手动选择不同，请核对。':'');
  if(!historyManualWeek)chooseHistoryWeek(detected.number);
  updateHistoryPreview();
}
function selectHistorySheet(){
  if(!historyWorkbook)return;
  const name=historyWorkbook.SheetNames[Number($('historySheet').value)||0],sheet=historyWorkbook.Sheets[name];
  if(!sheet||!sheet['!ref']){setHistorySource([],historySource,['该工作表为空，请选择包含积分明细的工作表']);return}
  const range=XLSX.utils.decode_range(sheet['!ref']);
  if(range.e.r>=2000||range.e.c>=30)throw Error('工作表超过 2000 行或 30 列，请仅保留一周积分表后导入');
  const issues=[];
  for(const [address,cell] of Object.entries(sheet)){
    if(address.startsWith('!'))continue;
    if(cell.t==='e'||cell.f&&(cell.v===undefined||cell.v===null||cell.v===''))issues.push('单元格 '+address+' 的公式未计算或出错，请在 Excel 中重新计算并保存。');
  }
  setHistorySource(XLSX.utils.sheet_to_json(sheet,{header:1,raw:true,defval:'',blankrows:true}),historySource+' '+name,issues);
}
$('historyImportBtn').onclick=openHistoryImport;
$('historyTemplateBtn').onclick=async()=>{
  try{
    await loadXlsx();
    const book=XLSX.utils.book_new();
    const sheet=XLSX.utils.aoa_to_sheet([ClassStarsHistory.TEMPLATE_HEADERS]);
    XLSX.utils.book_append_sheet(book,sheet,'班级之星评比');
    XLSX.writeFile(book,'班级之星评比-历史积分模板.xlsx');
  }catch(error){toast('模板下载失败：'+error.message)}
};
$('historyWeekNumber').onchange=()=>{
  historyManualWeek=true;
  try{chooseHistoryWeek($('historyWeekNumber').value);updateHistoryPreview()}catch(error){chooseHistoryWeek(null);$('historyCommitBtn').disabled=true;$('historySummary').textContent=error.message}
};
$('historyWeekDate').onchange=()=>{
  historyManualWeek=true;
  try{chooseHistoryWeek($('historyWeekDate').value?ClassStarsHistory.weekNumber($('historyWeekDate').value):null);updateHistoryPreview()}catch(error){chooseHistoryWeek(null);$('historyCommitBtn').disabled=true;$('historySummary').textContent=error.message}
};
$('historyNameAck').onchange=updateHistoryPreview;
$('historyPaste').oninput=()=>{
  historyLoadToken++;historyWorkbook=null;historySource='粘贴内容';$('historyFile').value='';$('historySheetWrap').hidden=true;
  setHistorySource(parseRows($('historyPaste').value),historySource);
};
$('historySheet').onchange=()=>{
  try{selectHistorySheet()}catch(error){historyGrid=[];historyIssues=[error.message];updateHistoryPreview()}
};
$('historyFile').onchange=async event=>{
  const file=event.target.files[0];if(!file)return;
  const token=++historyLoadToken;historyWorkbook=null;historyGrid=[];historyIssues=[];historySource=file.name;
  $('historyPaste').value='';$('historySheetWrap').hidden=true;$('historyCommitBtn').disabled=true;$('historyPreview').innerHTML='';$('historySummary').textContent='正在读取文件…';
  try{
    if(file.size>10*1024*1024)throw Error('请使用 10MB 以下的每周表格');
    if(!/\.(xlsx|xls|csv)$/i.test(file.name))throw Error('请选择 .xlsx、.xls 或 .csv 文件');
    await loadXlsx();const buffer=await file.arrayBuffer();if(token!==historyLoadToken)return;
    if(/\.csv$/i.test(file.name)){
      let content=new TextDecoder('utf-8').decode(buffer);if(content.includes('\uFFFD'))content=new TextDecoder('gb18030').decode(buffer);
      setHistorySource(parseRows(content),file.name);return;
    }
    historyWorkbook=XLSX.read(buffer,{type:'array'});
    if(!historyWorkbook.SheetNames.length)throw Error('文件中没有工作表');
    $('historySheet').innerHTML=historyWorkbook.SheetNames.map((name,index)=>'<option value="'+index+'">'+esc(name)+'</option>').join('');$('historySheet').value=String(Math.max(0,historyWorkbook.SheetNames.indexOf('完整周数据')));
    $('historySheetWrap').hidden=historyWorkbook.SheetNames.length===1;selectHistorySheet();
  }catch(error){if(token!==historyLoadToken)return;historyGrid=[];historyIssues=[error.message];updateHistoryPreview();toast('读取失败：'+error.message)}
};
$('historyCommitBtn').onclick=()=>{
  const plan=currentHistoryPlan();
  if(plan.errors.length||!plan.rows.length){updateHistoryPreview();toast('请先修正预览中的错误并选择所属周');return}
  if(plan.nameConflicts.length&&!$('historyNameAck').checked){toast('请先确认姓名差异');return}
  if(!confirm('导入第'+plan.number+'周（'+plan.period.start+' — '+plan.period.end+'）？\n将删除该周原有 '+(plan.replaced||0)+' 条，替换为文件中的 '+plan.records.length+' 条明细（含未列出学生的该周记录）。其他周记录和现有名单保留。'))return;
  try{
    {
      const next=ClassStarsHistory.merge(state,plan,$('historyNameAck').checked);validate(next);
      localStorage.setItem(KEY,JSON.stringify(next));state=next;
    }
    week=plan.period.start;render();$('historyImportDialog').close();
    toast('已覆盖第'+plan.number+'周：'+plan.records.length+' 条明细，其他周保留');
  }catch(error){toast('导入未完成，原有数据保留：'+error.message);updateHistoryPreview()}
};
