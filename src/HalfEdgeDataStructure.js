import { DataUtils } from "three";

import { ExactMathPlane } from "./ExactMathGeometry";
import * as Utils from "./utils/utils.js"

class HalfEdgeStructure{
    constructor(vertices, halfEdges, edges, faces){
        this.vertices = vertices;
        this.halfEdges = halfEdges;
        this.edges = edges;
        this.faces = faces;
    }

    updateCoords(){
        this.vertices.forEach(vertex=>{
            vertex.point = vertex.compute3DPoint();
        })
    }
    updateEmbeddedPlanes(){
        this.vertices.forEach(vertex=>{
            vertex.embeddedPlaneEquation = vertex.computeEmbeddedPlanEquation();
        });
        this.edges.forEach(edge=>{
            edge.embeddedPlaneEquation = edge.computeEmbeddedPlanEquation();
        });
    }
    updateSupportPlanes(){
        this.edges.forEach(edge=>{
            edge.supportPlaneEquation = edge.computeSupportPlaneEquation();
        });
    }
}


class Vertex{
    constructor(halfEdge, point, nbAdjacentFaces){
        this.halfEdge = halfEdge;

        this.point = point;
        this.embeddedPlaneEquation = null;
        this.nbAdjacentFaces = nbAdjacentFaces;
    }

    getAdjacentFaces(){
        let faces = [];
        let h = this.halfEdge;
        do{
            faces.push(h.face);
            h = h.opposite.next;
        }while(h!=this.halfEdge);
        return faces;
    }

    getAdjacentSupportEdges(){
        let supportEdges = [];
        let h = this.halfEdge;
        do{
            if(h.edge.supportPlanEquation){
                supportEdges.push(h.edge);
            }
            h = h.opposite.next;
        }while(h!=this.halfEdge);
        return supportEdges;
    }

    getAdjacentHalfEdges(){
        let halfEdges = [];
        let h = this.halfEdge;
        do{
            halfEdges.push(h);
            h = h.opposite.next;
        }while(h!=this.halfEdge);
        return halfEdges;
    }

    getAdjacentEdges(){
        let edges = [];
        let h = this.halfEdge;
        do{
            edges.push(h.edge);
            h = h.opposite.next;
        }while(h!=this.halfEdge);
        return edges;
    }
    
    compute3DPoint(){
        let faces = this.getAdjacentFaces();
        let supportEdges = this.getAdjacentSupportEdges();

        let planes = [];
        faces.forEach(face=>{
            planes.push(face.planEquation);
        });
        supportEdges.forEach(edge=>{ 
            planes.push(edge.supportPlanEquation);
        });

        return ExactMathPlane.computeIntersectionPoint(...planes);
    }

    computeEmbeddedPlanEquation(){
        if(typeof(this.pointData.embeddedPlanEquation[i][0])=="number"){
            this.pointData.embeddedPlanEquation[i] = this.computeDefaultEmbeddedPlan(0,i);
        }
        let [x,y,z] = this.computeExactCoords(i);
        let [a,b,c,d] = this.pointData.embeddedPlanEquation[i];
        //console.log(i,x,y,z,a,b,c);
        this.pointData.embeddedPlanEquation[i][3] = a.neg().mul(x).sub(b.mul(y)).sub(c.mul(z));
    }
}

class HalfEdge{
    constructor(origin, opposite, next, face, edge){
        this.origin = origin;
        this.opposite = opposite;
        this.next = next;
        this.face = face;

        this.edge = edge;
    }
    
    previous(){
        let h=this.next;
        while(h.next!=this){
            h = h.next;
        }
        return h;
    }
}

class Edge{
    constructor(halfEdge, underconstrained = false, supportPlaneEquation = null){
        this.halfEdge = halfEdge;

        this.supportPlaneEquation = supportPlaneEquation;
        this.embeddedPlaneEquation = null;
        this.underconstrained = underconstrained;
        this.flipable = false;
    }

    getAdjacentFaces(){
        let h_o = this.halfEdge.opposite;
        return [this.halfEdge.face, h_o.face];
    }

    getTouchingFaces(){
        let faces_1 = this.halfEdge.origin.getAdjacentFaces();
        let faces_2 = this.halfEdge.origin.opposite.getAdjacentFaces();
        return Utils.mergeListsWithoutDoubles(faces_1, faces_2);
    }
}

class Face{
    constructor(exteriorHalfEdge, interiorHalfEdges, planeEquation){
        this.exteriorHalfEdge = exteriorHalfEdge;
        this.interiorHalfEdges = interiorHalfEdges;
        this.planEquation = planeEquation;


    }

    getExteriorBorder(){
        let borderHalfEdges = [];
        let h = this.exteriorHalfEdge;
        do{
            borderHalfEdges.push(h);
            h = h.next;
        }while(h!=this.exteriorHalfEdge)
        
        return(borderHalfEdges);
    }

    getInteriorBorders(){
        let borderHalfEdges = [];
        interiorHalfEdges.forEach(interiorHalfEdge=>{
            let interiorRing = [];
            let h = interiorHalfEdge;
            do{
                interiorRing.push(h);
                h = h.next;
            }while(h!=interiorHalfEdge)
            borderHalfEdges.push(interiorRing);
        })
        
        return(borderHalfEdges);
    }

    getBorders(){
        return [this.getExteriorBorder()].concat(this.getInteriorBorders());
    }
}






















class PointData{
    constructor(points3D, heIndex, nbAdjacentFaces, supportPlanEquation=new Array(points3D.length)){
        //topological model
        this.coords  = points3D;
        this.heIndex = heIndex;
        this.count   = points3D.length;

        this.embeddedPlanEquation = new Array(this.count);
        this.supportPlanEquation = supportPlanEquation;

        //grapphical embedding
        this.nbAdjacentFaces = nbAdjacentFaces;
        this.selectedPoint  = -1;
        //this.moving = new Array(this.count);


    }
    add(he_id, embeddedPlanEquation=[NaN, NaN, NaN, NaN],supportPlanEquation){
        this.coords.push([0,0,0]);
        this.heIndex.push([he_id]);
        this.embeddedPlanEquation.push(embeddedPlanEquation);
        this.supportPlanEquation.push(supportPlanEquation);
        this.nbAdjacentFaces.push(-1);
        this.count+=1;
    }
    delete(p_id){
        this.coords.splice(p_id, 1);
        this.heIndex.splice(p_id, 1);
        this.nbAdjacentFaces.splice(p_id, 1);
        this.embeddedPlanEquation.splice(p_id,1);
        this.supportPlanEquation.splice(p_id,1);
        this.count-=1;
    }

    getAdjacentHalfEdges(p_id, he_data){
        let halfEdges = [];
        let current = this.heIndex[p_id];
        do{
            halfEdges.push(current);
            let opp_he = he_data.opposite(current)
            halfEdges.push(opp_he);
            current = he_data.next(opp_he);
        }while(current!=this.heIndex[p_id])
        return halfEdges;
    }

    changeSelectedPoint(newPointIndex, material){
        this.selectedPoint = newPointIndex;
        material.uniforms.selectedPointId.value = newPointIndex;
        material.needsUpdate = true;
    }

    copy(){
        let coords = [];
        this.coords.forEach(c=>{
            coords.push([...c]);
        })
        let heIndex = [];
        this.heIndex.forEach(c=>{
            heIndex.push([...c]);
        })
        let copySupport = new Array(this.count);
        for (let i=0; i<this.count; i++){
            if(this.supportPlanEquation[i]){
                copySupport[i]=[...this.supportPlanEquation[i]]
            }
        }
          
        let copy = new PointData(coords, heIndex, [...this.nbAdjacentFaces], copySupport);
        for (let i=0; i<this.count; i++){
            copy.embeddedPlanEquation[i]=[...this.embeddedPlanEquation[i]]
        }
        return copy;
    }


    
}

class HalfEdgeData{
    constructor(pIndex, oppIndex, nextIndex, fIndex, eIndex){
        this.pIndex    = pIndex;
        this.oppIndex  = oppIndex;
        this.nextIndex = nextIndex;
        this.fIndex    = fIndex;
        this.eIndex    = eIndex;
        this.count     = pIndex.length;
    }
    add(p_id, opp_id, next_id, f_id, e_id){
        this.pIndex.push(p_id);
        this.oppIndex.push(opp_id);
        this.nextIndex.push(next_id);
        this.fIndex.push(f_id);
        this.eIndex.push(e_id);
        this.count+=1;
    }
    delete(he_id){
        this.pIndex.splice(he_id, 1);
        this.oppIndex.splice(he_id, 1);
        this.nextIndex.splice(he_id, 1);
        this.fIndex.splice(he_id, 1);
        this.eIndex.splice(he_id, 1);
        this.count-=1;
        for(let i=0; i<this.count; i++){
            if(this.oppIndex[i]==he_id){
                this.oppIndex[i]=-1;
            }
            else if(this.oppIndex[i]>he_id){
                this.oppIndex[i]-=1;
            }

            if(this.nextIndex[i]==he_id){
                this.nextIndex[i]=-1;
            }
            else if(this.nextIndex[i]>he_id){
                this.nextIndex[i]-=1;
            }
        }
    }
    next(he_id){
        return(this.nextIndex[he_id]);
    }
    opposite(he_id){
        return(this.oppIndex[he_id]);
    }
    vertex(he_id){
        return(this.pIndex[he_id]);
    }
    face(he_id){
        return(this.fIndex[he_id]);
    }
    targetPoint(he_id){
        let next = this.next(he_id);
        return this.vertex(next);
    }

    previous(he_id){
        let he = this.next(he_id);
        while(this.next(he)!=he_id){
            he = this.next(he);
        }
        return he;
    }

    remove(id){
        this.eIndex[id]=null;
        this.vIndex[2*id]=null;
        this.vIndex[2*id+1]=null;
    }

    set(id, e_id, v_id){
        this.eIndex[id] = e_id;
        this.vIndex[2*id] = v_id[0];
        this.vIndex[2*id+1] = v_id[1];
    }

    reset(){
        this.eIndex = new Array(this.count);
        this.vIndex = new Array(2*this.count);
    }

    copy(){
        return new HalfEdgeData([...this.pIndex], [...this.oppIndex], [...this.nextIndex], [...this.fIndex], [...this.eIndex]);
    }
}

class EdgeData{
    constructor(heIndex, supportPlanEquation= new Array(heIndex.length), underconstrained = new Array(heIndex.length).fill(false)){
        this.heIndex = heIndex;
        this.count = this.heIndex.length;
        this.selectedEdge = -1;
        this.embeddedPlanEquation = new Array(this.count);
        this.flipable = new Array(this.count).fill(false);
        this.supportPlanEquation = supportPlanEquation;
        this.underconstrained = underconstrained;
    }
    changeSelectedEdge(newEdgeIndex, material){
        this.selectedEdge = newEdgeIndex;
        material.uniforms.selectedEdgeId.value = newEdgeIndex;
        material.needsUpdate = true;
    }
    add(he_id, embeddedPlanEquation=[NaN, NaN, NaN, NaN]){
        this.heIndex.push(he_id);
        this.embeddedPlanEquation.push(embeddedPlanEquation);
        this.supportPlanEquation.push(null);
        this.flipable.push(false);
        this.underconstrained.push(false);
        this.count+=1;
    }
    delete(e_id){
        this.heIndex.splice(e_id, 1);
        this.flipable.splice(e_id,1);
        this.embeddedPlanEquation.splice(e_id,1);
        this.count-=1;
    }
    copy(){
        let copy = new EdgeData([...this.heIndex]);
        for (let i=0; i<this.count; i++){
            copy.embeddedPlanEquation[i]=[...this.embeddedPlanEquation[i]];
            copy.underconstrained[i] = this.underconstrained[i];
        }
        for (let i=0; i<this.count; i++){
            if(this.supportPlanEquation[i]){
                copy.supportPlanEquation[i]=[...this.supportPlanEquation[i]];
            }
        }
        return copy;
    }
}




class FaceData{
    constructor(planeEquation, hExtIndex, hIntIndices){
        //Topological && geometrical data
        this.planeEquation = planeEquation;
        this.hExtIndex     = hExtIndex;
        this.hIntIndices   = hIntIndices;
        this.count         = planeEquation.length;

        //Graphical embedding
        this.selectedFace  = -1;
        this.color         = [];
        this.opacity       = [];

    }

    getExterior(he_data){
        let exterior = [];
        let current_he = this.hExtIndex;
        do{
            exterior.push(current_he);
            current_he = he_data.next(current_he);
        }while(current_he!=this.hExtIndex)
        return exterior;
    }

    getInteriors(he_data){
        let interiors = [];
        this.hIntIndices.forEach(he_int=>{
            let interior = [];
            let current_he = he_int;
            do{
                interior.push(current_he);
                current_he = he_data.next(current_he);
            }while(current_he!=this.hExtIndex)
            interiors.push(interior);
        })
        return interiors;
    }

    changeSelectedFace(newFaceIndex, material){
        this.selectedFace = newFaceIndex;
        material.uniforms.selectedFaceId.value = this.selectedFace;
        material.needsUpdate = true;
    }

    add(hExtIndex, hIntIndices, planEquation){
        this.hExtIndex.push(hExtIndex);
        this.hIntIndices.push(hIntIndices);
        this.planeEquation.push(planEquation);
        this.count+=1;
    }

    delete(f_id){
        this.planeEquation.splice(f_id, 1);
        this.hExtIndex.splice(f_id, 1);
        this.hIntIndices.splice(f_id, 1);
        this.color.splice(f_id, 1);
        this.opacity.splice(f_id, 1);
        this.count-=1;
    }


    copy(){
        let hExtIndex = [];
        this.hExtIndex.forEach(he=>{
            hExtIndex.push([...he]);
        })
        let hIntIndices = [];
        this.hIntIndices.forEach(hi=>{
            hIntIndices.push([...hi]);
        })
        let planeEquation = [];
        this.planeEquation.forEach(pe=>{
            planeEquation.push([...pe]);
        })
        return new FaceData(planeEquation, hExtIndex, hIntIndices);
    }


}

class DualGraph{
    constructor(edges){
        this.edges 
    }
}

export {HalfEdgeStructure, PointData, FaceData, HalfEdgeData, EdgeData, Vertex, Edge, Face, HalfEdge};