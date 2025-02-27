import { Controller } from "./controllers/controller";
import { EdgeData, FaceData, HalfEdgeData, PointData } from "./GeometricalProxy";
import { computeIntersectionPoint2_exact } from "./utils/3DGeometricComputes";
import { ExactMatrix } from "./utils/exactMatrix";
import { ExactNumber as N } from "exactnumber/dist/index.umd";
import * as Certificats from "./certificats";
import * as THREE from 'three';

import { mock_builds } from './objectCreation.js';
import * as ExactMathUtils from './utils/exactMathUtils';
import { loaders } from './loaders/loaders.js';
import { ControllersCollection } from "./controllers/controllersCollection.js";
import { dualMaterial, pointsMaterial } from "./materials/materials";
import { isTopologicallyValid } from "./validityCheck.js";

let tests = [];
let funcTests = [];

function runTests(){
    tests.forEach(test=>{
        runTest(test,0);
    });
    funcTests.forEach(test=>{
        runTest(test,1);
    });
    
}

function runTest(test, type){
    if(type==0){
        if(!test()){
            console.warn("%cfailed at test "+test.name, "color : red; background-color: rgb(248, 190, 190)");
        }
        else{
            console.info("%csucceed at test "+test.name, "color : green; background-color: rgb(181, 255, 181)")
        }
    }
    else if(type==1){
        if(!test()){
            console.warn("%cfailed at test "+test.name, "color : red; background-color: rgb(248, 190, 190)");
        }
        else{
            console.info("%csucceed at test "+test.name, "color : blue; background-color: rgb(167, 179, 252)")
        }
    }
}




function testMatrixSystemResolve(){
    let A_values = [[1,0,0],[0,1,0],[0,0,1], [2,2,0]];
    let D_values = [[-1],[-1],[-1],[-4]];

    let A = new ExactMatrix(A_values);
    let D = new ExactMatrix(D_values);

    let res = A.solve(D);

    let valid = res[0][0].neg().eq(N(1)) && res[1][0].neg().eq(N(1)) && res[2][0].neg().eq(N(1));

    return valid;
}
tests.push(testMatrixSystemResolve);

function testPlanIntersectionCompute(){
    let plans = [[1,0,0,-1],[0,1,0,-1],[0,0,1,-1],[2,2,0,-4]];

    let res = computeIntersectionPoint2_exact(...plans);

    let valid = res[0].eq(N(1)) && res[1].eq(N(1)) && res[2].eq(N(1));

    return valid;
}
tests.push(testPlanIntersectionCompute);

function testCoordsCompute(){
    //testing on a cube
    let faceData = new FaceData(
        [[N(0),N(1),N(0),N(0)], [N(1),N(0),N(0),N(-1)], [N(1),N(0),N(0),N(0)], [N(0),N(0),N(1),N(-1)], [N(0),N(0),N(1),N(0)], [N(0),N(1),N(0),N(-1)]],
        [[0],[4],[9],[12],[16],[20]],
        [[],[],[],[],[],[]]
    );
    let pointData = new PointData(
        [[N(0),N(0),N(0)],[N(0),N(0),N(1)],[N(1),N(0),N(1)],[N(1),N(0),N(0)],[N(0),N(1),N(0)],[N(0),N(1),N(1)],[N(1),N(1),N(1)],[N(1),N(1),N(0)]],
        [[0],[1],[2],[3],[10],[11],[6],[7]],
        [3,3,3,3,3,3,3,3],
        []
    );
    let halfEdgeData = new HalfEdgeData(
        [0,1,2,3,3,2,6,7,1,0,4,5,2,1,5,6,0,3,7,4,5,4,7,6],
        [8,12,4,16,2,15,22,17,0,19,20,13,1,11,23,5,3,7,21,9,10,18,6,14],
        [1,2,3,0,5,6,7,4,9,10,11,8,13,14,15,12,17,18,19,16,21,22,23,20],
        [0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5],
        [0,1,2,3,2,6,10,7,0,4,8,5,1,5,9,6,3,7,11,4,8,11,10,9]
    );
    let edgeData = new EdgeData(
        [0,1,2,3,9,11,5,7,10,14,6,18]
    )

    let controller = new Controller(faceData,pointData,halfEdgeData,edgeData,0,null,false,false);
    let res = controller.computeExactCoords(6);
    let valid = res[0].eq(N(1)) && res[1].eq(N(1)) && res[2].eq(N(1));
    return valid;
}
tests.push(testCoordsCompute);

function testAutoIntersectionDetect(){
    //Testing on a degenerated cube, with auto intersection on two opposite sides
    let faceData = new FaceData(
        [[N(-1),N(1),N(0),N(0)], [N(1),N(0),N(0),N(-1)], [N(1),N(0),N(0),N(0)], [N(0),N(0),N(1),N(-1)], [N(0),N(0),N(1),N(0)], [N(1),N(1),N(0),N(-1)]],
        [[0],[4],[9],[12],[16],[20]],
        [[],[],[],[],[],[]]
    );
    let pointData = new PointData(
        [[N(0),N(0),N(0)],[N(0),N(0),N(1)],[N(1),N(1),N(1)],[N(1),N(1),N(0)],[N(0),N(1),N(0)],[N(0),N(1),N(1)],[N(1),N(0),N(1)],[N(1),N(0),N(0)]],
        [[0],[1],[2],[3],[10],[11],[6],[7]],
        [3,3,3,3,3,3,3,3],
        []
    );
    let halfEdgeData = new HalfEdgeData(
        [0,1,2,3,3,2,6,7,1,0,4,5,2,1,5,6,0,3,7,4,5,4,7,6],
        [8,12,4,16,2,15,22,17,0,19,20,13,1,11,23,5,3,7,21,9,10,18,6,14],
        [1,2,3,0,5,6,7,4,9,10,11,8,13,14,15,12,17,18,19,16,21,22,23,20],
        [0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5],
        [0,1,2,3,2,6,10,7,0,4,8,5,1,5,9,6,3,7,11,4,8,11,10,9]
    );
    let edgeData = new EdgeData(
        [0,1,2,3,9,11,5,7,10,14,6,18]
    )

    let controller = new Controller(faceData,pointData,halfEdgeData,edgeData,0,null,false,false);
    let valid = !Certificats.autoIntersects(controller, 0)
                &&!Certificats.autoIntersects(controller, 1)
                &&!Certificats.autoIntersects(controller, 2)
                &&Certificats.autoIntersects(controller, 3)
                &&Certificats.autoIntersects(controller, 4)
                &&!Certificats.autoIntersects(controller, 5);
    return valid;
}
tests.push(testAutoIntersectionDetect);

function testFutureAutoIntersectionDetect(){
    //Testing on a degenerated cube, with auto intersection on two opposite sides
    let faceData = new FaceData(
        [[N("0.25"),N(-1),N(0),N(0)], [N(1),N(0),N(0),N(-1)], [N(1),N(0),N(0),N(0)], [N(0),N(0),N(1),N(-1)], [N(0),N(0),N(1),N(0)], [N("0.25"),N(1),N(0),N(-1)]],
        [[0],[4],[9],[12],[16],[20]],
        [[],[],[],[],[],[]]
    );
    let pointData = new PointData(
        [[N(0),N(0),N(0)],[N(0),N(0),N(1)],[N(1),N("0.25"),N(1)],[N(1),N("0.25"),N(0)],[N(0),N(1),N(0)],[N(0),N(1),N(1)],[N(1),N("0.75"),N(1)],[N(1),N("0.75"),N(0)]],
        [[0],[1],[2],[3],[10],[11],[6],[7]],
        [3,3,3,3,3,3,3,3],
        []
    );
    let halfEdgeData = new HalfEdgeData(
        [0,1,2,3,3,2,6,7,1,0,4,5,2,1,5,6,0,3,7,4,5,4,7,6],
        [8,12,4,16,2,15,22,17,0,19,20,13,1,11,23,5,3,7,21,9,10,18,6,14],
        [1,2,3,0,5,6,7,4,9,10,11,8,13,14,15,12,17,18,19,16,21,22,23,20],
        [0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5],
        [0,1,2,3,2,6,10,7,0,4,8,5,1,5,9,6,3,7,11,4,8,11,10,9]
    );
    let edgeData = new EdgeData(
        [0,1,2,3,9,11,5,7,10,14,6,18]
    )

    let controller = new Controller(faceData,pointData,halfEdgeData,edgeData,0,null,false,false);
    let valid = !controller.checkAutoIntersections(1,N("0.5"))
                &&controller.checkAutoIntersections(1,N("1.5"));
    return valid;
}
tests.push(testFutureAutoIntersectionDetect);

function testNextEventDetect(){
    //Testing on a degenerated cube, with auto intersection on two opposite sides
    let faceData = new FaceData(
        [[N("0.25"),N(-1),N(0),N(0)], [N(1),N(0),N(0),N(-1)], [N(1),N(0),N(0),N(0)], [N(0),N(0),N(1),N(-1)], [N(0),N(0),N(1),N(0)], [N("0.25"),N(1),N(0),N(-1)]],
        [[0],[4],[9],[12],[16],[20]],
        [[],[],[],[],[],[]]
    );
    let pointData = new PointData(
        [[N(0),N(0),N(0)],[N(0),N(0),N(1)],[N(1),N("0.25"),N(1)],[N(1),N("0.25"),N(0)],[N(0),N(1),N(0)],[N(0),N(1),N(1)],[N(1),N("0.75"),N(1)],[N(1),N("0.75"),N(0)]],
        [[0],[1],[2],[3],[10],[11],[6],[7]],
        [3,3,3,3,3,3,3,3],
        []
    );
    let halfEdgeData = new HalfEdgeData(
        [0,1,2,3,3,2,6,7,1,0,4,5,2,1,5,6,0,3,7,4,5,4,7,6],
        [8,12,4,16,2,15,22,17,0,19,20,13,1,11,23,5,3,7,21,9,10,18,6,14],
        [1,2,3,0,5,6,7,4,9,10,11,8,13,14,15,12,17,18,19,16,21,22,23,20],
        [0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5],
        [0,1,2,3,2,6,10,7,0,4,8,5,1,5,9,6,3,7,11,4,8,11,10,9]
    );
    let edgeData = new EdgeData(
        [0,1,2,3,9,11,5,7,10,14,6,18]
    )

    let controller = new Controller(faceData,pointData,halfEdgeData,edgeData,0,null,false,false);
    controller.findTValidityInterval(1, []);
    let valid = controller.rightEvent&&controller.leftEvent;
    if(valid){
        let t_right = controller.rightEvent.t;
        let t_left = controller.leftEvent.t;
        valid = t_right.eq(N(1))&&t_left.eq(N(-1));
        console.log(t_right.toNumber(), t_left.toNumber());
    }
    
    return valid;
}
tests.push(testNextEventDetect);

/**
 * Tests if the default embedded plan of an edge pass through the ends of the edge.
 * @returns
 */
function testDefaultEdgeEmbeddedPlan(){
    //Testing on the L house
    const mockName = "LHouse";
    let controllers=new ControllersCollection([],0,new THREE.Scene(),new THREE.Scene(),new THREE.Scene(),dualMaterial.clone(),pointsMaterial.clone());
    if(mockName!=""){
        loaders.MockLoader.loadObject(mock_builds[mockName], controllers);
    }

    let controller = controllers.controllers[0];

    let valid = true;
    for (let i=0; i<controller.edgeData.count; i++){
        let [a,b,c,d] = controller.edgeData.embeddedPlanEquation[i];
        let h0 = controller.edgeData.heIndex[i];
        let h1 = controller.halfEdgeData.opposite(h0);
        let v0 = controller.halfEdgeData.vertex(h0);
        let v1 = controller.halfEdgeData.vertex(h0);

        let p0 = controller.computeExactCoords(v0);
        let p1 = controller.computeExactCoords(v1);

        let valid_0 = a.mul(p0[0]).add(b.mul(p0[1])).add(c.mul(p0[2])).add(d);
        let valid_1 = a.mul(p1[0]).add(b.mul(p1[1])).add(c.mul(p1[2])).add(d);

        valid = valid_0.isZero() && valid_1.isZero();
        if(!valid){
            break;
        }
    }
    
    return valid;
}
tests.push(testDefaultEdgeEmbeddedPlan);

/**
 * Tests if the default embedded plan of a vertex pass through the 3D point associated to the vertex.
 * @returns
 */
function testDefaultVertexEmbeddedPlan(){
    //Testing on the L house
    const mockName = "LHouse";
    let controllers=new ControllersCollection([],0,new THREE.Scene(),new THREE.Scene(),new THREE.Scene(),dualMaterial.clone(),pointsMaterial.clone());
    if(mockName!=""){
        loaders.MockLoader.loadObject(mock_builds[mockName], controllers);
    }

    let controller = controllers.controllers[0];

    let valid = true;
    for (let i=0; i<controller.pointData.count; i++){
        let [a,b,c,d] = controller.pointData.embeddedPlanEquation[i];

        let p0 = controller.computeExactCoords(i);

        let valid_0 = a.mul(p0[0]).add(b.mul(p0[1])).add(c.mul(p0[2])).add(d);
        
        valid = valid_0.isZero();
        if(!valid){
            break;
        }
    }
    
    return valid;
}
tests.push(testDefaultVertexEmbeddedPlan);



/**
 * Tests if the default embedded plan of an edge pass through the ends of the edge.
 * @returns
 */
function testSavedEdgeEmbeddedPlan(){
    const mockName = "LHouse";
    let controllers=new ControllersCollection([],0,new THREE.Scene(),new THREE.Scene(),new THREE.Scene(),dualMaterial.clone(),pointsMaterial.clone());
    if(mockName!=""){
        loaders.MockLoader.loadObject(mock_builds[mockName], controllers);
    }

    let controller = controllers.controllers[0];

    let face_deleted =[];
    let [a_old, b_old, c_old] = controller.faceData.planeEquation[5].slice(0,3);
    while(face_deleted.indexOf(5)==-1){
        face_deleted = controller.faceShift(5,N(-10));
    }

    let [a,b,c,d] = controller.edgeData.embeddedPlanEquation[0];
    let h0 = controller.edgeData.heIndex[0];
    let h1 = controller.halfEdgeData.opposite(h0);
    let v0 = controller.halfEdgeData.vertex(h0);
    let v1 = controller.halfEdgeData.vertex(h0);

    let p0 = controller.computeExactCoords(v0);
    let p1 = controller.computeExactCoords(v1);

    let valid_0 = a.mul(p0[0]).add(b.mul(p0[1])).add(c.mul(p0[2])).add(d);
    let valid_1 = a.mul(p1[0]).add(b.mul(p1[1])).add(c.mul(p1[2])).add(d);

    let valid = valid_0.isZero() && valid_1.isZero() && 
                a_old.eq(a) && b_old.eq(b) && c_old.eq(c);
    
    return valid;
}
tests.push(testSavedEdgeEmbeddedPlan);

/**
 * Tests if the default embedded plan of a vertex pass through the 3D point associated to the vertex.
 * @returns
 */
function testSavedVertexEmbeddedPlan(){
    //Testing on the L house
    const mockName = "TPyramid";
    let controllers=new ControllersCollection([],0,new THREE.Scene(),new THREE.Scene(),new THREE.Scene(),dualMaterial.clone(),pointsMaterial.clone());
    if(mockName!=""){
        loaders.MockLoader.loadObject(mock_builds[mockName], controllers);
    }

    let controller = controllers.controllers[0];

    let [a_old, b_old, c_old] = controller.faceData.planeEquation[5].slice(0,3);
    let face_deleted =[];
    while(face_deleted.indexOf(5)==-1){
        face_deleted = controller.faceShift(5,N(-10));
    }
    
    let [a,b,c,d] = controller.pointData.embeddedPlanEquation[4];

    let p0 = controller.computeExactCoords(4);

    let valid_0 = a.mul(p0[0]).add(b.mul(p0[1])).add(c.mul(p0[2])).add(d);
    
    let valid = valid_0.isZero() && 
    a_old.eq(a) && b_old.eq(b) && c_old.eq(c);
    if(!valid){
        console.log(a_old.toNumber(), a.toNumber(), b_old.toNumber(), b.toNumber(), c_old.toNumber(), c.toNumber());
    }
    
    return valid;
}
tests.push(testSavedVertexEmbeddedPlan);








function funcTestFaceDegenToEdge(){
    //Testing on a degenerated cube, with auto intersection on two opposite sides
    const mockName = "LHouse";
    let controllers=new ControllersCollection([],0,new THREE.Scene(),new THREE.Scene(),new THREE.Scene(),dualMaterial.clone(),pointsMaterial.clone());
    if(mockName!=""){
        loaders.MockLoader.loadObject(mock_builds[mockName], controllers);
    }

    let controller = controllers.controllers[0];
    let face_deleted =[];
    while(face_deleted.indexOf(5)==-1){
        face_deleted = controller.faceShift(5,N(-10));
    }
    controller.splitCellIntoFace(0,1);

    let e0 = controller.halfEdgeData.eIndex[46];
    let e1 = controller.halfEdgeData.eIndex[49];

    let l0 = controller.edgeSquareLengthExact(e0);
    let l1 = controller.edgeSquareLengthExact(e1);

    console.log(l0.toNumber());
    console.log(l1.toNumber());
    let valid = l0.isZero() && l1.isZero() && isTopologicallyValid(controller);

    //face_deleted = controller.faceShift(5,N(-5));

    

    return valid;
}
funcTests.push(funcTestFaceDegenToEdge);


function funcTestCreatedFaceFromEdge_move(){
    //Testing on a degenerated cube, with auto intersection on two opposite sides
    const mockName = "LHouse";
    let controllers=new ControllersCollection([],0,new THREE.Scene(),new THREE.Scene(),new THREE.Scene(),dualMaterial.clone(),pointsMaterial.clone());
    if(mockName!=""){
        loaders.MockLoader.loadObject(mock_builds[mockName], controllers);
    }

    let controller = controllers.controllers[0];
    let face_deleted =[];
    while(face_deleted.indexOf(5)==-1){
        face_deleted = controller.faceShift(5,N(-10));
    }
    controller.splitCellIntoFace(0,1);

    let e0 = controller.halfEdgeData.eIndex[46];
    let e1 = controller.halfEdgeData.eIndex[49];

    let l0 = controller.edgeSquareLengthExact(e0);
    let l1 = controller.edgeSquareLengthExact(e1);

    console.log(l0.toNumber());
    console.log(l1.toNumber());
    let valid = l0.isZero() && l1.isZero() && isTopologicallyValid(controller);

    //face_deleted = controller.faceShift(5,N(-5));

    

    return false;
}
//funcTests.push(funcTestCreatedFaceFromEdge_move);



export{runTests};