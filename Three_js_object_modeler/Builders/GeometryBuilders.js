import { Point3D, Polygon, LinearRing, MultiSurface } from "../CityGMLGeometricModel";
import { VertexData, TriangleData } from "../graphicalModels";
import { PointData, FaceData, HalfEdgeData, EdgeData } from "../GeometricalProxy";
import { Building, BuildingPart, ClosureSurface, WallSurface, FloorSurface, OuterFloorSurface, GroundSurface, RoofSurface } from "../CityGMLLogicalModel";
import { Controller, DualController } from "../controllers/controller";
import * as Utils from '../utils/utils';
import * as GeomUtils from '../utils/3DGeometricComputes'
import { Heap } from 'heap-js';
import { ExactNumber as N } from "exactnumber/dist/index.umd";
import { ExactMatrix } from "../utils/exactMatrix";
import { isTopologicallyValid } from "../validityCheck";
import { exactArrayToFloatArray } from "../utils/exactMathUtils";



class GeometryBuilder{
    constructor(correctionType = 2){
        this.face_data            = {};
        this.point_data           = {};
        this.halfedge_data        = {};
        this.edge_data            = {};
        this.face_data_object     = {};
        this.point_data_object    = {};
        this.GMLModel     = {};
        if(correctionType==1){
            this.algoCorrection = this.correctPlans
        }
        else{
            this.algoCorrection = this.correctPlans2
        }
    } 
    build(building, LoD){
        let minPointId = building.minPointId;
        let maxPointId = building.maxPointId;
        let minFaceId = building.minFaceId;
        let maxFaceId = building.maxFaceId;
        let nPts = maxPointId-minPointId+1;
        let nFaces = maxFaceId-minFaceId+1;
        this.face_data        = {'hExtIndex': new Array(nFaces), 'hIntIndices':new Array(nFaces),'planeEquation':new Array(nFaces)};
        this.point_data       = {'heIndex' : new Array(nPts),'nbAdjacentFaces': new Array(nPts), 'coords':new Array(nPts), 'supportPlanEquation':new Array(nPts)};
        this.halfedge_data    = {'fIndex':[],'pIndex' : [], 'oppIndex' : [], 'nextIndex' : [], 'eIndex':[]};
        this.edge_data        = {'heIndex':[], 'supportPlanEquation':[], 'underconstrained':[]}
        this.GMLModel = building;
        this.LoD = LoD;

        //console.log("Build Begin");

        //First we fill the points data coords
        for(let i=minPointId; i<=maxPointId; i++){
            let point3D=Point3D.pointsList[i];
            this.point_data.coords[point3D.id-minPointId]=[point3D.x, point3D.y, point3D.z];
        }

        
        let boundaryThematicSurfaces = building.getBoundary();
        
        
        //console.log("Surface loop");
        boundaryThematicSurfaces.forEach(thematicSurface=>{
            //let type = thematicSurface.getType();
            let boundarySurfaces = thematicSurface.getLoD(LoD).surfaces;

            boundarySurfaces.forEach(polygon=>{

                //this.face_data filling
                //this.face_data.bIndex[polygon.id] = building.id;
                //this.face_data.type[polygon.id]   = type;
                this.face_data.planeEquation[polygon.id-minFaceId] = polygon.planeEquation;

                //Creation of the half edges
                let n_ext_he = polygon.exterior.size;
                let nb_he = this.halfedge_data.pIndex.length;
                this.face_data.hExtIndex[polygon.id-minFaceId] = [nb_he];

                for(let i=0; i<n_ext_he; i++){
                    let point3Do = polygon.exterior.positions[i];
                    let origin = point3Do.id-minPointId;
                    let point3Dt = polygon.exterior.positions[(i+1)%n_ext_he];
                    let target = point3Dt.id-minPointId;
                    for(let j=0; j<this.halfedge_data.pIndex.length; j++){
                        let origin2 = this.halfedge_data.pIndex[j];
                        let target2 = this.halfedge_data.pIndex[this.halfedge_data.nextIndex[j]];
                        if (origin2==origin && target2==target){
                            polygon.reverse();
                            break;
                        }
                    }
                }

                for(let i=0; i<n_ext_he; i++){
                    let point3D = polygon.exterior.positions[i];
                    let origin = point3D.id-minPointId;
                    let next = nb_he + ((i+1)%n_ext_he);
                    this.halfedge_data.pIndex.push(origin);
                    this.halfedge_data.nextIndex.push(next);
                    this.halfedge_data.fIndex.push(polygon.id-minFaceId);
                    this.point_data.heIndex[origin]=[nb_he+i];
                }

                this.face_data.hIntIndices[polygon.id-minFaceId]=[];
                polygon.interiors.forEach(interior=>{
                    let n_int_he = interior.size;
                    let nb_he = this.halfedge_data.pIndex.length;
                    console.log(this.face_data);
                    this.face_data.hIntIndices[polygon.id-minFaceId].push(nb_he);
                    for(let i=0; i<n_int_he; i++){
                        let point3D = interior.positions[i];
                        let origin = point3D.id-minPointId;
                        let next = nb_he + ((i+1)%n_int_he);
                        this.halfedge_data.pIndex.push(origin);
                        this.halfedge_data.nextIndex.push(next);
                        this.halfedge_data.fIndex.push(polygon.id-minFaceId);
                    }
                })

            })
        })

        //On remplit les données opposite edge des half edges
        //console.log("half_edge loop");
        this.halfedge_data.oppIndex = new Array(this.halfedge_data.pIndex.length);

        for(let i=0; i<this.halfedge_data.pIndex.length; i++){
            let origin = this.halfedge_data.pIndex[i];
            let target = this.halfedge_data.pIndex[this.halfedge_data.nextIndex[i]];
            for(let j=0; j<i; j++){
                let origin2 = this.halfedge_data.pIndex[j];
                let target2 = this.halfedge_data.pIndex[this.halfedge_data.nextIndex[j]];
                if(origin2==target && target2==origin){
                    this.halfedge_data.oppIndex[i]=j;
                    this.halfedge_data.oppIndex[j]=i;
                    break;
                }
            }
        }

        //Compute the edge data
        //console.log("Edge loop");
        this.halfedge_data.eIndex = new Array(this.halfedge_data.pIndex.length).fill(-1);
        for(let i=0; i<this.halfedge_data.pIndex.length; i++){
            if(this.halfedge_data.eIndex[i]==-1){
                let opp_id = this.halfedge_data.oppIndex[i];

                this.edge_data.heIndex.push(i);
                let e_id = this.edge_data.heIndex.length-1;

                this.halfedge_data.eIndex[i] = e_id;
                this.halfedge_data.eIndex[opp_id] = e_id;
            }
        }

        

        //computes the number of faces adjacent to the points
        //console.log("Arrity loop");
        for(let i=0; i<this.point_data.nbAdjacentFaces.length; i++){
            let faces = this.__getAdjacentFaces(i)
            
            this.point_data.nbAdjacentFaces[i]=faces.length;
            
            //Add a supplort plan if the adjacent plans does not define
            //properly the point
            /*if(faces.length>=3){
                let values = [];
                for(let i=0; i<faces.length; i++){
                    let eq = this.face_data.planeEquation[faces[i]];
                    values.push([...eq]);
                }
                


                let r = new ExactMatrix(values).rank();
                if(r<=3){
                    let n;

                    let n1 = this.face_data.planeEquation[faces[0]].slice(0,3);
                    let n2 = this.face_data.planeEquation[faces[1]].slice(0,3);
                    let n3 = this.face_data.planeEquation[faces[2]].slice(0,3);
                    
                    let n1_n2 = Utils.crossProduct(n1,n2);
                    let n1_n3 = Utils.crossProduct(n1,n3);
                    let n2_n3 = Utils.crossProduct(n2,n3);
                    if(!Utils.norme(n1_n2).isZero()){
                        n = n1_n2;
                    }
                    else if(!Utils.norme(n1_n3).isZero()){
                        n = n1_n3;
                    }
                    else if(!Utils.norme(n2_n3).isZero()){
                        n = n2_n3;
                    }
                    else{
                        let n1_f=[n1[0].toNumber(),n1[1].toNumber(),n1[2].toNumber()];
                        let n2_f=[n2[0].toNumber(),n2[1].toNumber(),n2[2].toNumber()];
                        let n3_f=[n3[0].toNumber(),n3[1].toNumber(),n3[2].toNumber()];
                        console.log(n1_f,n2_f,n3_f);
                        throw new Error("Point not enough constainted");
                    }


                    let p1 = this.point_data.coords[i];
                    let d = n[0].mul(p1[0]).add(n[1].mul(p1[1])).add(n[2].mul(p1[2]));
                    d = d.neg();
                    this.point_data.supportPlanEquation[i]=[...n, d];
                }
            }
            else{
                
            }*/
        }


        
        for(let i=0; i<this.edge_data.heIndex.length; i++){
            let h1 = this.edge_data.heIndex[i];
            let h2 = this.halfedge_data.oppIndex[h1];

            let v1 = this.halfedge_data.pIndex[h1];
            let v2 = this.halfedge_data.pIndex[h2];
            //console.log(this.halfedge_data.oppIndex,h1,v1, h2);

            let faces1 = this.__getAdjacentFaces(v1);
            let faces2 = this.__getAdjacentFaces(v2);

            let faces = Utils.getCommonElts(faces1, faces2);

            let values = [];

            let eq1 = this.face_data.planeEquation[faces[0]];
            let eq2 = this.face_data.planeEquation[faces[1]];
            values.push([...eq1]);
            values.push([...eq2]);
            
            let M = new ExactMatrix(values);
            if(M.rank()<2){
                /*console.log("##########################");
                console.log("##########################");
                console.log(i, M.rank(true));
                console.log("___________________________");
                M.print();*/
                let [a,b,c,d]=[...eq1];
                let n = [a,b,c];
                let p1 = this.point_data.coords[v1];
                let p2 = this.point_data.coords[v2];
                let v = [p2[0].sub(p1[0]),p2[1].sub(p1[1]),p2[2].sub(p1[2])];
                let n_support = Utils.normalize(Utils.crossProduct(n,v));
                let d_support = Utils.dotProduct(n_support, p1).neg();
                this.edge_data.supportPlanEquation[i]=[...n_support, d_support];
                this.edge_data.underconstrained[i]=true;
            }
            else{
                this.edge_data.underconstrained[i]=false;
            }
        }

        //console.log("face arrity computed");
        

        this.face_data_object     = new FaceData(this.face_data.planeEquation,this.face_data.hExtIndex, this.face_data.hIntIndices);
        this.point_data_object    = new PointData(this.point_data.coords, this.point_data.heIndex, this.point_data.nbAdjacentFaces, this.point_data.supportPlanEquation);
        this.halfedge_data_object = new HalfEdgeData(this.halfedge_data.pIndex, this.halfedge_data.oppIndex, this.halfedge_data.nextIndex, this.halfedge_data.fIndex, this.halfedge_data.eIndex);
        this.edge_data_object     = new EdgeData(this.edge_data.heIndex, this.edge_data.supportPlanEquation, this.edge_data.underconstrained);
        
    }



    correctPlans2(controller){
        console.log("CORRECT PLANES 2");
        let difficultFaces = [];
        for(let i=0; i<controller.faceData.count; i++){
            let h_ext=controller.faceData.hExtIndex[i][0];
            let h = h_ext;
            let n_overconstrained_vertices=0;
            do{
                let v = controller.halfEdgeData.vertex(h);
                let faces = controller.findAdjacentFaces(v);
                if(faces.length>4){
                    n_overconstrained_vertices+=1;
                    if(n_overconstrained_vertices>=4){
                        difficultFaces.push(i);
                        break;
                    }
                }
                h=controller.halfEdgeData.next(h);
            }while(h!=h_ext)
        }

        for(let i=0; i<difficultFaces.length; i++){
            console.log("----> difficult face : ",i)
            let face = difficultFaces[i];
            let coords = [];
            let h_ext=controller.faceData.hExtIndex[i][0];
            let h = h_ext;
            do{
                let v = controller.halfEdgeData.vertex(h);
                coords.push(controller.pointData.coords[v]);
                
                h=controller.halfEdgeData.next(h);
            }while(h!=h_ext)
            let [a,b,c,d] = GeomUtils.estimatePlanEquationLCconstrained(coords);
            controller.faceData.planeEquation[face] = [a,b,c,d];
        }

        for(let i=0; i<controller.pointData.count; i++){
            let faces = controller.findAdjacentFaces(i);
            if(faces.length>=4){
                let difficultAdjacentFaces = Utils.getCommonElts(faces, difficultFaces);
                let n_difficultAdjacentFaces = difficultAdjacentFaces.length;
                if(n_difficultAdjacentFaces>3){
                    throw new Error("Impossible to correct the import, to many constraint a difficult vertex.");
                }
                else if(n_difficultAdjacentFaces==3){
                    console.log("---->Projecting point", i, "on intersection of 3 planes.");
                    let plan1 = controller.faceData.planeEquation[difficultAdjacentFaces[0]];
                    let plan2 = controller.faceData.planeEquation[difficultAdjacentFaces[1]];
                    let plan3 = controller.faceData.planeEquation[difficultAdjacentFaces[2]];
                    let coords = GeomUtils.computeIntersectionPoint2(plan1, plan2, plan3);
                    controller.pointData.coords[i]= coords;
                }
                else if(n_difficultAdjacentFaces==2){
                    console.log("---->Projecting point", i, "on intersection of 2 planes.");
                    let plan1 = controller.faceData.planeEquation[difficultAdjacentFaces[0]];
                    let plan2 = controller.faceData.planeEquation[difficultAdjacentFaces[1]];
                    let input_coords = controller.pointData.coords[i];

                    let line = GeomUtils.computeIntersectionLine(plan1, plan2);
                    let coords = GeomUtils.projectPointOnLine(input_coords, line);
                    controller.pointData.coords[i]= coords;
                }
                else if(n_difficultAdjacentFaces==1){
                    console.log("---->Projecting point", i, "on intersection of 1 planes.");
                    let plan1 = controller.faceData.planeEquation[difficultAdjacentFaces[0]];
                    let input_coords = controller.pointData.coords[i];

                    let coords = GeomUtils.projectPointOnPlane(input_coords, plan1);
                    controller.pointData.coords[i]= coords;
                }
            }
        }

        for(let i=0; i<controller.faceData.count; i++){
            if(difficultFaces.indexOf(i)==-1){
                //console.log("----> other face ",i)
                let fixed_coords = [];
                let other_coords = [];
                let h_ext=controller.faceData.hExtIndex[i][0];
                let h = h_ext;
                do{
                    let v = controller.halfEdgeData.vertex(h);
                    let faces = controller.findAdjacentFaces(v);
                    if(faces.length>=4){
                        fixed_coords.push(controller.pointData.coords[v]);
                    }
                    else{
                        other_coords.push(controller.pointData.coords[v]);
                    }
                    h=controller.halfEdgeData.next(h);
                }while(h!=h_ext)
                console.log("----> other face ",i, exactArrayToFloatArray(controller.faceData.planeEquation[i]));
                controller.faceData.planeEquation[i] = GeomUtils.estimatePlanEquationLCconstrained(other_coords, fixed_coords);
                console.log("---->              ", exactArrayToFloatArray(controller.faceData.planeEquation[i]));
            }
        }

        controller.reorientNormals();
        isTopologicallyValid(controller);
        
    }


    


    /**
     * Tries to correct the plans of the model such that it 
     * correspond to the geometry. 
     * @param {Controller} controller 
     */
    correctPlans(controller){
        PriorityFace.controller = controller;
        PriorityFace.instances = [];
        PriorityFace.constraints = new Array(controller.pointData.count);
        for(let i=0; i<PriorityFace.constraints.length; i++){
            PriorityFace.constraints[i] = [];
        }
        
        const customPriorityComparator = (a, b) => b.priority - a.priority;
        const facesQueue = new Heap(customPriorityComparator);
        facesQueue.init([]);
        for(let i=0; i<this.face_data_object.count;i++){
            
            let borders = controller.getFaceBorders(i);
            let points = borders[0];
            borders[1].forEach(interior=>{
                points.push(...interior);
            });
            let priorityFace = new PriorityFace(i,points);
            facesQueue.push(priorityFace);
        }

        while(!facesQueue.isEmpty()){
            //console.log(PriorityFace.toString());
            //console.log([...PriorityFace.instances]);
            let face = facesQueue.pop();
            //console.log(face.id, face.points_id, facesQueue.toArray());
            let fixedPoints = face.getFixedPoints();
            if(fixedPoints.length>1){
                let d4;
                console.log("face "+face.id+" position constrained by points "+String(fixedPoints));

                for(let i=0; i<fixedPoints.length; i++){
                    let p_id = fixedPoints[i];
                    
                    let plans = PriorityFace.constraints[p_id];
                    let equations = [];
                    plans.forEach(plan=>{
                        equations.push([...controller.faceData.planeEquation[plan]]);
                    })
                    equations.push([...controller.faceData.planeEquation[face.id]]);
                    let M_eq = new ExactMatrix(equations);
                    let M_eq_reduced = M_eq.reducedMatrix();
                    equations = M_eq_reduced.values;
                    let values1 = [[...equations[1].slice(0,3)],[...equations[2].slice(0,3)],[...equations[3].slice(0,3)]];
                    let values2 = [[...equations[0].slice(0,3)],[...equations[2].slice(0,3)],[...equations[3].slice(0,3)]];
                    let values3 = [[...equations[0].slice(0,3)],[...equations[1].slice(0,3)],[...equations[3].slice(0,3)]];
                    let values4 = [[...equations[0].slice(0,3)],[...equations[1].slice(0,3)],[...equations[2].slice(0,3)]];

                    let d1 = equations[0][3];
                    let d2 = equations[1][3];
                    let d3 = equations[2][3];
                    if(typeof(d1)=="number"){
                        d1 = N(d1);
                    }
                    if(typeof(d2)=="number"){
                        d2 = N(d2);
                    }
                    if(typeof(d3)=="number"){
                        d3 = N(d3);
                    }

                    let A1 = (new ExactMatrix(values1)).det();
                    let A2 = (new ExactMatrix(values2)).det();
                    let A3 = (new ExactMatrix(values3)).det();
                    let A4 = (new ExactMatrix(values4)).det();
                    if(A4.isZero()){
                        console.log(p_id, PriorityFace.constraints[p_id]);
                        new ExactMatrix(values4).print();
                    }
                    let d4_i = d1.mul(A1).sub(d2.mul(A2)).add(d3.mul(A3)).div(A4);//(d1*A1-d2*A2+d3*A3)/A4
                    if(d4){
                        if(!d4.eq(d4_i)){
                            throw new Error("Correction impossible, to many constraint on a face.");
                        }
                    }
                    else{
                        d4 = d4_i;
                    }
                }
                controller.faceData.planeEquation[face.id][3]=d4;

                
            }
            else if(fixedPoints.length==1){
                let p_id = fixedPoints[0];
                //console.log("face "+face.id+" position constrained by point "+p_id);
                let plans = PriorityFace.constraints[p_id];
                let equations = [];
                plans.forEach(plan=>{
                    equations.push([...controller.faceData.planeEquation[plan]]);
                })
                equations.push([...controller.faceData.planeEquation[face.id]]);
                let M_eq = new ExactMatrix(equations);
                let M_eq_reduced = M_eq.reducedMatrix();
                equations = M_eq_reduced.values;
                let values1 = [[...equations[1].slice(0,3)],[...equations[2].slice(0,3)],[...equations[3].slice(0,3)]];
                let values2 = [[...equations[0].slice(0,3)],[...equations[2].slice(0,3)],[...equations[3].slice(0,3)]];
                let values3 = [[...equations[0].slice(0,3)],[...equations[1].slice(0,3)],[...equations[3].slice(0,3)]];
                let values4 = [[...equations[0].slice(0,3)],[...equations[1].slice(0,3)],[...equations[2].slice(0,3)]];

                let d1 = equations[0][3];
                let d2 = equations[1][3];
                let d3 = equations[2][3];
                if(typeof(d1)=="number"){
                    d1 = N(d1);
                }
                if(typeof(d2)=="number"){
                    d2 = N(d2);
                }
                if(typeof(d3)=="number"){
                    d3 = N(d3);
                }

                let A1 = (new ExactMatrix(values1)).det();
                let A2 = (new ExactMatrix(values2)).det();
                let A3 = (new ExactMatrix(values3)).det();
                let A4 = (new ExactMatrix(values4)).det();

                let d4 = d1.mul(A1).sub(d2.mul(A2)).add(d3.mul(A3)).div(A4);//(d1*A1-d2*A2+d3*A3)/A4
                controller.faceData.planeEquation[face.id][3]=d4;

            }

            face.points_id.forEach(p_id=>{
                let plans = PriorityFace.constraints[p_id];
                /*let equations = [[...controller.faceData.planeEquation[face.id]]];
                plans.forEach(plan=>{
                    equations.push([...controller.faceData.planeEquation[plan]]);
                })*/
                PriorityFace.constraints[p_id].push(face.id);
                //PriorityFace.constraints[p_id].push(face.id);
            })
            PriorityFace.updatePriorities();

        }
        
    }


        /**
     * Recherche les sommets n'étant adjacent qu'à 2 faces, et les supprimes.
     * @param {Controller} controller 
     */
        reapairTopology(controller){
            for(let i=0; i<controller.pointData.count; i++){
                let faces = controller.findAdjacentFaces(i);
                if(faces.length<=2){
                    //Get components
                    let [h0,h1] = controller.pointData.getAdjacentHalfEdges(i,controller.halfEdgeData);
                    
                    let h0_o = controller.halfEdgeData.opposite(h0);
                    let h1_o = controller.halfEdgeData.opposite(h1);
    
                    let h1_op = controller.halfEdgeData.previous(h1_o);
                    let h1_n  = controller.halfEdgeData.next(h1);
    
                    let v1 =controller.halfEdgeData.vertex(h1_o);
                    
                    let f0 = controller.halfEdgeData.fIndex[h0];
                    let f1 = controller.halfEdgeData.fIndex[h1];
                    
                    let e = controller.halfEdgeData.eIndex[h1];
                    //Change pointers
                    controller.halfEdgeData.pIndex[h0] = v1;
                    controller.halfEdgeData.nextIndex[h1_op] = h0;
                    controller.halfEdgeData.nextIndex[h0_o] = h1_n;
    
                    controller.pointData.heIndex[v1][0]=h0;
                    if(controller.faceData.hExtIndex[f0][0]==h1_o){
                        controller.faceData.heIndex[f0][0]=h0;
                    }
                    for(let j=0; j<controller.faceData.hIntIndices; i++){
                        if(controller.faceData.hIntIndices[f0][j]==h1_o){
                            controller.faceData.hIntIndices[f0][j]=h0;
                        }
                    }
    
                    if(controller.faceData.hExtIndex[f1][0]==h1){
                        controller.faceData.heIndex[f1][0]=h0_o;
                    }
                    for(let j=0; j<controller.faceData.hIntIndices; i++){
                        if(controller.faceData.hIntIndices[f1][j]==h1){
                            controller.faceData.hIntIndices[f1][j]=h0_o;
                        }
                    }
                    
    
                    //Deletion
                    controller.deletePoint(i);
                    controller.deleteHalfEdge(max(h1, h1_o));
                    controller.deleteHalfEdge(min(h1, h1_o));
                    controller.deleteEdge(e);
                    i--;
    
                }
            }
    
        }

    /**
     * 
     * @returns A Controller object corresponding to this scene.
     */
    getScene(material){
        let c;
        /*try{*/
            c = new Controller(this.face_data_object, this.point_data_object, this.halfedge_data_object, this.edge_data_object, this.LoD, material);
            //this.reapairTopology(c);
            this.algoCorrection(c);
            c.updateCoords();
            c.onChange();
            return (c);
        /*}
        catch(error){
            console.error("Building could not be imported due to "+error);
            return (undefined);
        }*/
        
    }

    __getAdjacentFaces(v){
        let he_0 = this.point_data.heIndex[v][0];
        let he = he_0;
        let faces = [];
        let j=0;
        do{
            j++;
            faces = Utils.mergeListsWithoutDoubles(faces,[this.halfedge_data.fIndex[he]]);
            if(this.halfedge_data.oppIndex[he]==undefined&&he!=undefined){
                console.log("opp",he);
            }
            he = this.halfedge_data.oppIndex[he];
            if(this.halfedge_data.nextIndex[he]==undefined&&he!=undefined){
                console.log("next",he);
            }
            he = this.halfedge_data.nextIndex[he];
            
        }while(he!=he_0 && j<100)
        return faces;
    }
    

}

class PriorityFace{
    instances = [];
    constraints = [];
    controller = null;
    
    constructor(f_id, points){
        this.priority = 0;
        this.id = f_id;
        this.points_id = points;

        PriorityFace.instances.push(this);
    }
    static updatePriorities(){
        PriorityFace.instances.forEach(instance=>{
            let prio=0; 
            instance.points_id.forEach(p_id=>{
                if(PriorityFace.constraints[p_id].length>=3){
                    prio+=1;
                }
            })
            instance.priority = prio;
        })
    }

    getFixedPoints(){
        let fixedPoints = [];
        this.points_id.forEach(p_id=>{
            if(PriorityFace.getNbConstraints(p_id)>=3){
                fixedPoints.push(p_id);
            }
        })
        return fixedPoints;
    }

    static getNbConstraints(p_id){
        let planes = PriorityFace.constraints[p_id];
        let equations = [];
        planes.forEach(plan=>{
            equations.push([...PriorityFace.controller.faceData.planeEquation[plan]]);
        })
        let M = new ExactMatrix(equations);
        return M.rank();
    }

    static toString(){
        let s = "-".repeat(12)+"\n";
        for(let i=0; i<PriorityFace.constraints.length; i++){
            s+=String(i)+" : "+String(PriorityFace.constraints[i].length);
            s+=",    ["+String(PriorityFace.constraints[i])+"]\n";
        }
        s += "-".repeat(12);
        return s;
    }
    
}



export {GeometryBuilder}