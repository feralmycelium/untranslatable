import {test,expect} from 'bun:test';
import {placementIssue} from '../public/rules.js';
const trace=(x,y)=>({x,y,strokes:[{kind:'script',ink:'ink',seed:1,points:[[0,0,.5],[90,10,.5]]}]});
test('new traces preserve original drawings and existing contributions',()=>{
  expect(placementIssue(trace(0,0))).toContain('existing work');
  expect(placementIssue(trace(4200,4200),[trace(4230,4200)])).toContain('Another trace');
  expect(placementIssue(trace(4600,4600),[trace(4200,4200)])).toBeNull();
});
