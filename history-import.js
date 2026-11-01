(function(root){
  'use strict';
  const START='2026-08-31',DAY=86400000;
  const text=value=>String(value??'').normalize('NFKC').trim();
  function stamp(value){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(value))throw Error('日期格式应为年-月-日');
    const n=Date.parse(value+'T12:00:00Z');
    if(!Number.isFinite(n)||new Date(n).toISOString().slice(0,10)!==value)throw Error('日期不存在');
    return n;
  }
  const shift=(value,n)=>new Date(stamp(value)+n*DAY).toISOString().slice(0,10);
  function period(number){
    if(!Number.isInteger(number)||number<1||number>1000)throw Error('请选择第 1—1000 周');
    const start=shift(START,(number-1)*7);return {number,start,end:shift(start,6)};
  }
  function weekNumber(date){return Math.floor((stamp(date)-stamp(START))/(7*DAY))+1}
  function detectPeriod(grid,filename=''){
    function numbersIn(source){
      const numbers=new Set();
      for(const match of source.matchAll(/第\s*(\d+)\s*周/g))if(+match[1]>=1&&+match[1]<=1000)numbers.add(+match[1]);
      for(const match of source.matchAll(/(20\d{2})[-/.年](\d{1,2})[-/.月](\d{1,2})日?/g)){
        try{const n=weekNumber(match[1]+'-'+match[2].padStart(2,'0')+'-'+match[3].padStart(2,'0'));if(n>=1&&n<=1000)numbers.add(n)}catch(error){}
      }
      return numbers;
    }
    const first=grid.find(row=>row.some(value=>text(value))),titleNumbers=numbersIn((first||[]).map(text).join(' '));
    const fallback=numbersIn([filename,...grid.slice(0,10).map(row=>row.map(text).join(' '))].join(' '));
    const numbers=titleNumbers.size?titleNumbers:fallback;
    return {number:numbers.size===1?[...numbers][0]:null,message:numbers.size>1?'标题或文件中的周次、日期不一致，请手动确认所属周。':numbers.size?(titleNumbers.size?'已按 Excel 首行标题识别周次，请核对后确认。':'已识别文件周次，请核对后确认。'):'文件未注明周次，请选择第几周或该周任意日期。'};
  }
  function column(value){
    const name=text(value).replace(/\s/g,'');
    if(['学号','序号','编号'].includes(name))return 'no';
    if(['姓名','学生姓名','学生'].includes(name))return 'name';
    if(['总分','总计','合计','积分','本周积分'].includes(name))return 'total';
    if(['加分','加分明细','奖励'].includes(name))return 'positive';
    if(name==='周末')return 'weekend';
    if(name==='原始记录')return 'raw';
    if(['备注','说明'].includes(name))return 'note';
    const day=name.replace(/^(星期|周)/,'');
    return /^[一二三四五六日天]$/.test(day)?'day'+('一二三四五六日'.indexOf(day==='天'?'日':day)):null;
  }
  function layout(grid){
    for(let i=0;i<Math.min(grid.length,30);i++){
      const columns=grid[i].map(column);
      if(columns.includes('no')&&columns.includes('name')&&columns.includes('total')){
        for(const key of columns.filter(Boolean))if(columns.filter(c=>c===key).length>1)throw Error('表头重复：'+key);
        if(!columns.some(c=>c==='positive'||c==='weekend'||/^day/.test(c||'')))throw Error('只找到总分，请提供周一至周五、加分等积分明细列');
        return {header:i,columns};
      }
    }
    const first=grid.findIndex(row=>/^\d+$/.test(text(row[0]))&&text(row[1])&&text(row[2])!=='');
    if(first<0)throw Error('未找到积分表，请使用「学号、姓名、总分、一、二、三、四、五、加分」列');
    if(grid.slice(first).some(row=>row.length>9&&row.slice(9).some(v=>text(v))))throw Error('无表头数据超过九列，请补充表头以确认每列含义');
    return {header:first-1,columns:['no','name','total','day0','day1','day2','day3','day4','positive']};
  }
  function parseCell(value,rules,defaultKind){
    let raw=text(value).replace(/[−﹣]/g,'-').replace(/\s/g,'');
    if(!raw||['—','–','-','无','/'].includes(raw))return [];
    raw=raw.replace(/[;；,，、]/g,'');
    if(/^[+-]?\d+$/.test(raw)){
      const points=Number(raw);if(!Number.isSafeInteger(points)||Math.abs(points)>100)throw Error('每笔分数应在 -100 到 100 之间');
      if(!points)return [];
      if(defaultKind==='positive'&&points<0)throw Error('「加分」列出现扣分，请移入对应日期列');
      return [{points,short:points>0?'历史加分':'历史扣分',category:points>0?'历史加分':'历史扣分'}];
    }
    const result=[];let cursor=0;
    for(const match of raw.matchAll(/([+-])(\d+)([^+-]*)/g)){
      if(match.index!==cursor)throw Error('无法识别「'+raw+'」，请使用 -1作、+2进 这样的写法');
      cursor=match.index+match[0].length;
      const points=Number(match[1]+match[2]),label=match[3];
      if(!Number.isSafeInteger(points)||!points||Math.abs(points)>100)throw Error('每笔分数需为 -100 到 100 的非零整数');
      if(!/^[\p{Script=Han}A-Za-z][\p{Script=Han}A-Za-z0-9]{0,5}$/u.test(label))throw Error('无法识别分类「'+label+'」，简称需为 1—6 个字');
      if(defaultKind==='positive'&&points<0)throw Error('「加分」列出现扣分，请移入对应日期列');
      const sameSign=r=>Math.sign(r.points)===Math.sign(points);
      const rule=rules.find(r=>r.short===label&&sameSign(r))||rules.find(r=>r.name===label&&sameSign(r));
      result.push({points,short:rule?rule.short:label,category:rule?rule.name:label});
      if(result.length>500)throw Error('单格记录过多，请检查表格');
    }
    if(!result.length||cursor!==raw.length)throw Error('无法识别「'+raw+'」，请保留每笔分数前的加减号');
    return result;
  }
  const numberKey=value=>/^\d+$/.test(text(value))?String(Number(text(value))):text(value);
  function key(record){
    // Original weekly tables omit dates of additions and combine Saturday/Sunday.
    const weekday=new Date(stamp(record.date)).getUTCDay();
    const bucket=record.points>0?'positive':weekday===0||weekday===6?'weekend':record.date;
    return JSON.stringify([record.student,bucket,record.short,record.points]);
  }
  function preview(grid,state,number){
    const out={number,period:null,rows:[],records:[],additions:[],duplicates:0,errors:[],warnings:[],nameConflicts:[]};
    let info,format;
    try{info=period(number);out.period=info;format=layout(grid)}catch(error){out.errors.push(error.message);return out}
    const detected=detectPeriod(grid);
    if(detected.number&&detected.number!==number){out.errors.push('文件所属第'+detected.number+'周与所选周不一致，请选择文件对应周，避免覆盖其他周');return out}
    if(!detected.number&&/第\s*\d+\s*周/.test((grid[0]||[]).join(' '))){out.errors.push('标题周次与日期冲突，请修正文件');return out}
    const metadata=grid.slice(0,Math.max(0,format.header)).map(row=>row.map(text).join(' ')).join(' ');
    for(const m of metadata.matchAll(/第\s*(\d+)\s*周/g))if(Number(m[1])!==number)out.errors.push('文件周次与所选周不一致');
    const dates=[...metadata.matchAll(/(20\d{2})[-/.年](\d{1,2})[-/.月](\d{1,2})日?/g)].map(m=>m[1]+'-'+m[2].padStart(2,'0')+'-'+m[3].padStart(2,'0'));
    for(const date of dates){try{if(weekNumber(date)!==number)out.errors.push('文件日期与所选周不一致')}catch(error){out.errors.push(error.message)}}
    if(dates.length===2&&(dates[0]!==info.start||dates[1]!==info.end))out.errors.push('文件起止日期必须为该周周一至周日');
    if(out.errors.length)return out;
    if(grid.length>2000){out.errors.push('表格超过 2000 行，请每次导入一周');return out}
    const byNo=new Map(),seen=new Set();
    for(const student of state.students){const id=numberKey(student.no);if(byNo.has(id)){out.errors.push('现有名单学号 '+id+' 重复，请先整理');return out}byNo.set(id,student)}
    let uncertain=false;
    for(let i=format.header+1;i<grid.length;i++){
      const cells=grid[i];if(!cells.some(v=>text(v)))continue;
      const get=kind=>cells[format.columns.indexOf(kind)],rawNo=text(get('no')),name=text(get('name'));
      if(['合计','总计','说明','备注'].includes(rawNo))continue;
      const location='第 '+(i+1)+' 行';
      try{
        if(!rawNo||!name)throw Error('缺少学号或姓名');
        const student=byNo.get(numberKey(rawNo));if(!student)throw Error('学号 '+rawNo+' 不在现有名单，请先导入或修正学生名单');
        if(seen.has(student.id))throw Error('学号 '+rawNo+' 重复，请每位学生只保留一行');seen.add(student.id);
        const totalText=text(get('total'));
        if(!/^[+-]?\d+$/.test(totalText)||!Number.isSafeInteger(Number(totalText)))throw Error('总分不是整数，或公式尚未计算，请在 Excel 保存后再导入');
        const expected=Number(totalText),records=[];
        for(let c=0;c<cells.length;c++){
          const kind=format.columns[c];if(['no','name','total','note','raw'].includes(kind)||!text(cells[c]))continue;
          if(!kind)throw Error('第 '+(c+1)+' 列内容未识别，请补充正确表头');
          const tokens=parseCell(cells[c],state.rules,kind);
          for(const token of tokens){
            let offset,precision='day';
            if(kind==='positive'){offset=6;precision='week'}else if(kind==='weekend'){offset=5;precision='weekend'}else offset=Number(kind.slice(3));
            const extra=text(get('note'));if(extra.length>50)throw Error('备注超过 50 个字，请缩短后重试');
            const note='历史导入·第'+number+'周'+(precision==='week'?'；原表加分未注明具体日期':precision==='weekend'?'；原表周末未注明具体日期':'')+(extra?'；'+extra:'');
            records.push({...token,student:student.id,date:shift(info.start,offset),datePrecision:precision,note});
            if(precision!=='day')uncertain=true;
          }
        }
        if(format.columns.includes('raw')){
          const exact=JSON.parse(String(get('raw')));
          if(!Array.isArray(exact)||exact.length>100000)throw Error('原始记录格式错误');
          records.length=0;
          for(const r of exact){
            stamp(r.date);
            if(r.date<info.start||r.date>info.end)throw Error('原始记录日期超出所属周');
            if(!Number.isInteger(r.points)||!r.points||Math.abs(r.points)>100||typeof r.short!=='string'||r.short.length>6||typeof r.category!=='string'||r.category.length>20||typeof r.note!=='string'||r.note.length>100||!['day','week','weekend'].includes(r.datePrecision||'day'))throw Error('原始记录内容错误');
            records.push({student:student.id,date:r.date,points:r.points,short:r.short,category:r.category,note:r.note,datePrecision:r.datePrecision||'day'});
          }
        }
        const computed=records.reduce((sum,r)=>sum+r.points,0);
        if(computed!==expected)throw Error(name+'：表内总分 '+expected+'，明细合计 '+computed+'，请核对后重试');
        if(name!==student.name)out.nameConflicts.push({no:student.no,fileName:name,currentName:student.name});
        out.rows.push({student:student.id,no:student.no,name:student.name,fileName:name,expected,computed,count:records.length});
        out.records.push(...records);
      }catch(error){out.errors.push(location+'：'+error.message)}
      if(out.rows.length>500){out.errors.push('每次最多导入 500 位学生');break}
      if(out.records.length>100000){out.errors.push('单周明细超过 100000 条，请检查文件');return out}
    }
    if(!out.rows.length&&!out.errors.length)out.errors.push('没有找到可导入的学生行');
    if(uncertain)out.warnings.push('原表加分或周末记录未注明具体日期，将归入所选周并标注「具体日期未注明」，不会猜测实际发生日期。');
    out.replaced=state.records.filter(r=>r.date>=info.start&&r.date<=info.end).length;
    out.additions=out.records.slice();
    out.errors=[...new Set(out.errors)];
    return out;
  }
  function merge(state,plan,acknowledgeNames){
    if(plan.errors.length)throw Error('请先修正预览中的错误，尚未写入任何数据');
    if(plan.nameConflicts.length&&!acknowledgeNames)throw Error('请确认姓名差异，导入按学号匹配，现有姓名会保留');
    const retained=state.records.filter(r=>r.date<plan.period.start||r.date>plan.period.end);
    if(retained.length+plan.records.length>100000)throw Error('记录超过 100000 条，请先备份整理');
    const ids=new Set(retained.map(r=>r.id));let serial=0;
    const records=plan.records.map(r=>{let id;do{id='history-'+plan.period.start+'-'+r.student+'-'+(++serial)}while(ids.has(id));ids.add(id);return {...r,id}});
    return {...state,records:[...retained,...records]};
  }
  const api={START,period,weekNumber,detectPeriod,preview,merge};
  if(typeof module==='object'&&module.exports)module.exports=api;else root.ClassStarsHistory=api;
})(typeof window!=='undefined'?window:globalThis);
