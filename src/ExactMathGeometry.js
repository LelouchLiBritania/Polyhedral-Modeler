import { ExactNumber as N } from "exactnumber/dist/index.umd";


class ExactMathPlane{
    constructor(a,b,c,d){
        if(typeof(a)=="number"){
            this.a = N(String(a));
        }
        else{
            this.a=a;
        }

        if(typeof(b)=="number"){
            this.b = N(String(b));
        }
        else{
            this.b=b;
        }

        if(typeof(c)=="number"){
            this.c = N(String(c));
        }
        else{
            this.c=c;
        }

        if(typeof(d)=="number"){
            this.d = N(String(d));
        }
        else{
            this.d=d;
        }


        
    }

    
    add(obj){
        return new ExactMathPlane(this.a.add(obj.a),this.b.add(obj.b),this.c.add(obj.c),this.d.add(obj.d));
    }
    sub(obj){
        return new ExactMathPlane(this.a.sub(obj.a),this.b.sub(obj.b),this.c.sub(obj.c),this.d.sub(obj.d));
    }
    mul(x){
        return new ExactMathPlane(this.a.mul(x),this.b.mul(x),this.c.mul(x),this.d.mul(x));
    }
    div(x){
        if(x.isZero()){
            throw new Error("Division by 0");
        }
        else{
            return new ExactMathPlane(this.a.div(x),this.b.div(x),this.c.div(x),this.d.div(x));
        }
    }

    normal(){
        return
    }
    

    /**
     * 
     * @param  {...ExactMathPlane} plans 
     * @returns ExactMathPoint : The point where all the planes intersects,
     * if they intersects in one unique point. Throw an error otherwise.
     */
    static computeIntersectionPoint(...plans){
        if(plans.length<3){
            console.error("Underconstrained plan")
        }
        else{
            ////Gauss-Jordan algorithm
            let A_values = [];
            let D_values = [];
            //Initilisation du système d'équations
            plans.forEach(plan=>{
                A_values.push([plan.a, plan.b, plan.c]);
                D_values.push([plan.d]);
            })

            let A = new ExactMatrix(A_values);
            let D = new ExactMatrix(D_values);

            let res = A.solve(D);
            if(res.l !=0){
                return(new ExactMathPoint(res[0][0].neg(),res[1][0].neg(),res[2][0].neg()));
            }
            else{
                console.error("Planes doen't intersect in one same point");
            }
        }
        return p;
    }

    toExactArray(){
        return [this.a, this.b, this.c, this.d];
    }
}

class ExactVector{
    constructor(x,y,z){
        if(typeof(x)=="number"){
            this.x = N(String(x));
        }
        else{
            this.x=x;
        }

        if(typeof(y)=="number"){
            this.y = N(String(y));
        }
        else{
            this.y=y;
        }

        if(typeof(z)=="number"){
            this.z = N(String(z));
        }
        else{
            this.z=z;
        }
    }

    normeSquared(){
        return this.x.mul(this.x).add(this.y.mul(this.y)).add(this.z.mul(this.z));
    }

    normeApproximation(){
        let s = this.x.mul(this.x).add(this.y.mul(this.y)).add(this.z.mul(this.z));
        return N(String(Math.sqrt(s.toNumber())));
    }

}

class ExactMathPoint{
    constructor(x,y,z){
        if(typeof(x)=="number"){
            this.x = N(String(x));
        }
        else{
            this.x=x;
        }

        if(typeof(y)=="number"){
            this.y = N(String(y));
        }
        else{
            this.y=y;
        }

        if(typeof(z)=="number"){
            this.z = N(String(z));
        }
        else{
            this.z=z;
        }
    }

    distanceApproximate(exactGeom){
        if(typeof(exactGeom)==ExactMathPoint){
            let d_2 = this.squareDistance(exactGeom);
            return(N(String(Math.sqrt(d_2.toNumber()))));
        }
    }

    squareDistance(exactGeom){
        if(typeof(exactGeom)==ExactMathPoint){
            let dx = this.x.sub(exactGeom.x);
            let dy = this.y.sub(exactGeom.y);
            let dz = this.z.sub(exactGeom.z);

            return(dx.mul(dx).add(dy.mul(dy)).add(dz.mul(dz)));
        }
    }
}

export{
    ExactMathPlane,
    ExactVector,
    ExactMathPoint
}