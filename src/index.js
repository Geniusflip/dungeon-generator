import Delaunator from 'delaunator';
import { NotEqualDepth, Path } from 'three';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const { clientHeight, clientWidth } = document.documentElement;

canvas.height = clientHeight;
canvas.width = clientWidth;

ctx.setTransform(1, 0, 0, 1, 0, 0);

function Room(x, y, height, width) {
    this.type = 'default';
    this.x = x;
    this.y = y;
    this.height = height;
    this.width = width;
    this.strokeStyle = 'black';
    this.fillStyle = 'white';
    this.draw = function (ctx) {
        ctx.strokeStyle = this.strokeStyle;
        ctx.fillStyle = this.fillStyle;
        ctx.beginPath();
        ctx.rect(this.x, this.y, this.width, this.height);
        ctx.fill();
        ctx.stroke();
    }

    this.move = function (x, y) {
        this.x += x;
        this.y += y;
    }
    this.midPoint = function() {
        return {
            x: this.x + this.width / 2,
            y: this.y + this.height / 2,
        };
    }
}

const NUM_OF_ROOMS = 50;
const THRESHOLD = 0;
// const MAIN_ROOMS = Math.floor(NUM_OF_ROOMS / 3);


const rooms = [];
const getRand = (max, min = 1) => Math.floor(Math.random() * max ) + min;
while (rooms.length < NUM_OF_ROOMS) {
    const rando = getRand(80);
    const room = new Room(
        clientWidth / 2 + getRand(80, 40) - 100,
        clientHeight/ 2 + getRand(80, 40) - 100,
        Math.abs(Math.sin(getRand(80)) * 100 ) + 10,
        Math.abs(Math.cos(getRand(80)) * 100 ) + 10,
    );
    rooms.push(room);
}

const dist = (obj1, obj2) => Math.sqrt(Math.pow(obj2.x - obj1.x, 2) + Math.pow(obj2.y - obj1.y, 2))
const distanceBetweenTwoSquares = (square1, square2) => {
    const iterateOnSquarePoints = (point, square) => {
        return Math.min(
            dist({ x: point.x, y: point.y }, { x: square.x, y: square.y }),
            dist({ x: point.x, y: point.y }, { x: square.x + square.width, y: square.y }),
            dist({ x: point.x, y: point.y }, { x: square.x + square.width, y: square.y + square.height }),
            dist({ x: point.x, y: point.y }, { x: square.x, y: square.y + square.height }),
        );
    }
    return Math.min(
        iterateOnSquarePoints({x: square1.x, y: square1.y}, square2),
        iterateOnSquarePoints({x: square1.x + square1.width, y: square1.y}, square2),
        iterateOnSquarePoints({x: square1.x + square1.width, y: square1.y + square1.height}, square2),
        iterateOnSquarePoints({x: square1.x, y: square1.y + square1.height}, square2),
    )
}

const overlap = (roomA, roomB) => {
    return roomA.x < roomB.x + roomB.width &&
        roomA.x + roomA.width  > roomB.x && 
        roomA.y < roomB.y + roomB.height && 
        roomA.y + roomA.height > roomB.y;
}
const normalise = (v) => {
    const length = dist({ x: 0, y: 0}, v);
    return {
        x: v.x / length,
        y: v.y / length,
    }
}

const steerRooms = (rooms) => {
    let foundOne = false;
    rooms.forEach( roomA => {
        const v = { x: 0, y: 0 };
        let neighbours = 0;
        rooms.forEach( roomB => {
            if (roomA == roomB) { return; }
            const distance = distanceBetweenTwoSquares(roomA, roomB);
            if (distance < THRESHOLD || overlap(roomA, roomB)) {
                v.x = roomB.x - roomA.x;
                v.y = roomB.y - roomA.y;
                neighbours++;
            }
        });
        if (neighbours === 0) {
            return;
        }
        foundOne = true;
        const normalised = normalise({
            x: -(v.x / neighbours),
            y: -(v.y / neighbours),
        });
        roomA.move(normalised.x, normalised.y);
    });
    return foundOne
}

const draw = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    rooms.forEach(room => room.draw(ctx));
    if (steerRooms(rooms)) {
        setTimeout(() => requestAnimationFrame(() => draw()), 10)
    } else {
        selectRooms();
    }
}
const meanSize = rooms.reduce((sum, curr) => sum + curr.height * curr.width, 0) / rooms.length;

const selectRooms = () => {
    rooms.forEach(room => {
        if ((room.height * room.width) > meanSize * 1.25) {
            room.fillStyle = 'red';
            room.type = 'main';
        }
        room.draw(ctx);
    });
    generateDelauny();
}

const generateDelauny = () => {
    const midPoints = rooms
    .filter(room => room.type === 'main')
    .flatMap(room => {
        const point = room.midPoint();
        return [ point.x , point.y ];
    });
    const mesh = new Delaunator(midPoints).triangles;
    // console.error(new Delaunator(midPoints).halfedges);
    // console.error(mesh, midPoints);
    ctx.strokeStyle = 'blue';
    const coordinates = [];
    // for (let i = 0; i < mesh.length; i += 3) {
    //     ctx.beginPath();
    //     ctx.moveTo(midPoints[mesh[i] * 2], midPoints[mesh[i] * 2 + 1]);

    //     const goToPoint = (n) => {
    //         ctx.lineTo(midPoints[mesh[n] * 2], midPoints[mesh[n] * 2 + 1]);
    //     }
    //     goToPoint(i);
    //     goToPoint(i + 2);
    //     goToPoint(i + 1);
    //     ctx.closePath();
      
    //     ctx.stroke();
    // }
    mst(midPoints, mesh, 0);
}

const mst = (midPoints, mesh, point = 0) => {
    // return;
    const solution = {};
    let unvisited = [...new Set(mesh)];
    const getDist = (point1, point2) => dist(
        { x: midPoints[point1 * 2], y: midPoints[point1 * 2] + 1 },
        { x: midPoints[point2 * 2], y: midPoints[point2 * 2] + 1 },    
    )
    const addPoints = (a, b, c) => {
        solution[a] = {
            ...solution[a],
            [b]: getDist(a, b),
            [c]: getDist(a, c),
        },
        solution[b] = {
            ...solution[b],
            [a]: getDist(b, a),
            [c]: getDist(b, c),
        }
        solution[c] = {
            ...solution[c],
            [a]: getDist(c, a),
            [b]: getDist(c, b),
        }
    }
    
    for (let i = 0; i < mesh.length; i += 3) {
        addPoints(mesh[i], mesh[i + 1], mesh[i + 2]);
    }

    const edges = {};
    
    Object.keys(solution).forEach( key => {
        Object.keys(solution[key]).forEach( node => {
            edges[solution[key][node]] = [key, node];
        });
    });
    const sortedEdges = Object.keys(edges).sort().reverse().map(key => edges[key]);

    let minPath = [];
    while (sortedEdges.length) {
        const minEdge = sortedEdges.pop();
        if (minPath.length === 0) {
            minPath.push([minEdge]);
        }

        const pathsMinEdgePartOf = minPath.filter(path => {
            const flatPath = path.flatMap(x => x);
            return minEdge.some(x => flatPath.includes(x));
        }).map((_, i) => i);

        const isCyclic = pathsMinEdgePartOf.map(x => minPath[x]).some(path => {
            const flatPath = path.flatMap(x => x);
            return minEdge.every(x => flatPath.includes(x));
        }) 

        if (!isCyclic) {
            if (pathsMinEdgePartOf.length === 0 ) {
                minPath.push([ minEdge ]);
            }
            if (pathsMinEdgePartOf.length === 1) {
                const index = minPath.findIndex(path => {
                    const flatPath = path.flatMap(x => x);
                    return minEdge.some(x => flatPath.includes(x));
                });
                minPath[index].push(minEdge);
            }
            if (pathsMinEdgePartOf.length > 1) {
                const paths = minPath.filter((_, i) => !pathsMinEdgePartOf.includes(i));
                const combinedPath = [].concat( ...minPath.filter((_, i) => pathsMinEdgePartOf.includes(i)),);
                combinedPath.push(minEdge);
                paths.push(combinedPath);
                minPath = paths;
            }
        }

        // unvisited.pop();
        // unvisited.filter(x => x)
    }
   
    const result = minPath[0];
    createHallways(result);
}

const createHallways = (result) => {
    const mainRooms = rooms.filter(x => x.type === 'main');
    const lines = result.map(x => {
        const room1 = mainRooms[x[0]];
        const room2 = mainRooms[x[1]];
        const midPoint1 = room1.midPoint();
        const midPoint2 = room2.midPoint();

        // simillar x 
        if (Math.abs(midPoint1.x - midPoint2.x) < 20) {
            return [midPoint1.x, midPoint1.y, midPoint1.x, midPoint2.y];
        }
        // simillar y 
        if (Math.abs(midPoint1.y - midPoint2.y) < 20) {
            return [midPoint1.x, midPoint1.y, midPoint2.x, midPoint1.y];
        }
        // to the left
        if (midPoint1.y - midPoint2.y < 0) {
            if (
                lineIntersectsRoom([[midPoint1.x, midPoint1.y], [  midPoint2.x , midPoint1.y]], room2),
                lineIntersectsRoom([[midPoint1.x, midPoint1.y], [  midPoint2.x , midPoint1.y]], room2)
            ) {
                return [
                    midPoint1.x, midPoint1.y,
                    midPoint2.x , midPoint1.y,
                    midPoint2.x , midPoint2.y,
                ];
            } else {
                return [
                    midPoint1.x, midPoint1.y,
                    midPoint1.x , midPoint2.y,
                    midPoint2.x , midPoint2.y,
                ]
            }
        } else {
            return [
                midPoint1.x, midPoint1.y,
                midPoint1.x , midPoint2.y,
                midPoint2.x , midPoint2.y,
            ];
        }
    });
    
    
    lines.forEach(line => {
        rooms.filter(x => x.type !== 'main')
            .forEach(room => {
                for(let i = 0; i < line.length - 2; i += 2) {
                    // console.log(room);
                    // console.log(lineIntersectsRoom([[line[i], line[i + 1]], [line[i + 2], line[i + 3]]], room));
                    if (lineIntersectsRoom([[line[i], line[i + 1]], [line[i + 2], line[i + 3]]], room)) {
                        room.fillStyle = 'blue';
                        room.type = 'main';
                    }
                }
                // ctx.strokeStyle = 'yellow';
                // room.fillStyle = 'blue';
                // room.draw(ctx);
                // ctx.beginPath();
                // ctx.moveTo(line[0], line[1]);
                // for(let i = 0; i < line.length; i += 2) {
                //     ctx.lineTo(line[i], line[i+1]);
                // }
                // ctx.stroke();
            });
    })
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = '1';
    rooms.forEach(room => room.draw(ctx));
    ctx.lineWidth = '5';
    ctx.strokeStyle = 'pink';
    lines.forEach(line => {
        if (line.length === 0) { return; }
        ctx.beginPath();
        ctx.moveTo(line[0], line[1]);
        for(let i = 0; i < line.length; i += 2) {
            ctx.lineTo(line[i], line[i+1]);
        }
        ctx.stroke();
    });

}
const lineIntersects = ( line1, line2 ) => {
    const [[x1, y1] , [x2, y2] ] = line1;
    const [[x3, y3] , [x4, y4] ] = line2;
    // calculate the direction of the lines
    const uA = ((x4-x3)*(y1-y3) - (y4-y3)*(x1-x3)) / ((y4-y3)*(x2-x1) - (x4-x3)*(y2-y1));
    const uB = ((x2-x1)*(y1-y3) - (y2-y1)*(x1-x3)) / ((y4-y3)*(x2-x1) - (x4-x3)*(y2-y1));
    
    // if uA and uB are between 0-1, lines are colliding
    return uA >= 0 && uA <= 1 && uB >= 0 && uB <= 1;
}
const lineIntersectsRoom = (line, room) => {
    return lineIntersects(line, [[room.x, room.y], [room.x + room.width, room.y]]) ||
        lineIntersects(line, [[room.x + room.width, room.y], [room.x + room.width, room.y + room.height]]) ||
        lineIntersects(line, [[room.x, room.y + room.height], [room.x + room.width, room.y + room.height]]) ||
        lineIntersects(line, [[room.x , room.y], [room.x, room.y + room.height]]);
}

console.log(lineIntersects([[0,0], [100, 100]], [[0, 100], [100, 0]]))
requestAnimationFrame(draw)
