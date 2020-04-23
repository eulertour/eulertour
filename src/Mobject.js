import * as THREE from "three";
import { MeshLine, MeshLineMaterial } from "threejs-meshline";
import { BufferGeometryUtils } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { ShapeUtils } from "three/src/extras/ShapeUtils.js";
import { MobjectFillBufferGeometry } from "./MobjectFillBufferGeometry.js";
import * as utils from "./utils";

const DEFAULT_STYLE = {
  strokeColor: 0xffffff,
  strokeOpacity: 1,
  fillColor: 0x000000,
  fillOpacity: 1,
  strokeWidth: 4,
};

const STROKE_SHRINK_FACTOR = 80;

class Mobject extends THREE.Group {
  constructor(id, points, style) {
    super();
    this.mobjectId = id;
    this.style = Object.assign(DEFAULT_STYLE, style);
    this.shapes = this.computeShapes(points);
    this.fillMesh = new THREE.Mesh(
      this.computeFillGeometry(),
      this.computeFillMaterial(),
    );
    this.strokeMesh = new THREE.Mesh(
      this.computeStrokeGeometry(),
      this.computeStrokeMaterial(),
    );
    this.add(this.fillMesh);
    this.add(this.strokeMesh);
  }

  update(points, style, needsRedraw, /* needsTriangulation */) {
    if (needsRedraw) {
      this.shapes = this.computeShapes(points);

      // If a material is currently invisible and will continue to be invisible
      // on the next frame, skip updating the corresponding geometry.
      if (!(this.style.fillOpacity === 0 && style.fillOpacity === 0)) {
        this.updateFillGeometry();
      }
      if (!(this.style.strokeOpacity === 0 && style.strokeOpacity === 0)) {
        // TODO: Update this rather than destroying and recreating it.
        this.strokeMesh.geometry.dispose();
        this.strokeMesh.geometry = this.computeStrokeGeometry();
      }
    }

    this.style = Object.assign(this.style, style);
    this.updateFillMaterial();
    this.updateStrokeMaterial();
  }

  dispose() {
    this.fillMesh.geometry.dispose();
    this.fillMesh.material.dispose();
    this.strokeMesh.geometry.dispose();
    this.strokeMesh.material.dispose();
  }

  computeShapes(points) {
    let shapes = [];
    let holes = [];
    let path;
    let move = true;
    for (let i = 0; i < points.length / 4; i++) {
      let curveStartIndex = 4 * i;
      if (move) {
        path = new THREE.Path();
        path.moveTo(
          points[curveStartIndex][0],
          points[curveStartIndex][1],
        );
      }
      path.bezierCurveTo(
        points[curveStartIndex + 1][0],
        points[curveStartIndex + 1][1],
        points[curveStartIndex + 2][0],
        points[curveStartIndex + 2][1],
        points[curveStartIndex + 3][0],
        points[curveStartIndex + 3][1],
      );

      move = curveStartIndex + 4 === points.length;
      if (!move) {
        let lastPoint = points[curveStartIndex + 3];
        let nextPoint = points[curveStartIndex + 4];
        move = !utils.allClose(lastPoint, nextPoint);
      }
      if (move) {
        // Clockwise Paths and lines are considered holes.
        let isClockWise = ShapeUtils.area(path.getPoints()) < 1e-6;
        if (isClockWise) {
          // Assume path is a hole.
          let holeWasAdded = false;
          for (let i = shapes.length - 1; i >= 0; i--) {
            let shape = shapes[i];
            let shapeContainsHole = utils.isPointInsidePolygon(
              path.getPoint(0),
              shape.getPoints(),
            );
            if (shapeContainsHole) {
              shape.holes.push(path);
              holeWasAdded = true;
              break;
            }
          }
          if (!holeWasAdded) {
            holes.push(path);
          }
        } else {
          // Assume path is a shape.
          let shape = new THREE.Shape();
          for (let i = holes.length - 1; i >= 0; i--) {
            let hole = holes[i];
            let shapeContainsHole = utils.isPointInsidePolygon(
              hole.getPoint(0),
              path.getPoints(),
            );
            if (shapeContainsHole) {
              shape.holes.push(hole);
              holes.splice(i, 1);
            }
          }
          shape.curves.push(...path.curves);
          shapes.push(shape);
        }
      }
    }
    // Any unused holes are treated as Shapes.
    for (let hole of holes) {
      let shape = new THREE.Shape();
      shape.curves.push(...hole.curves);
      shapes.push(shape);
    }
    return shapes;
  }

  createMeshLineGeometries(shape) {
    let meshLineGeometries = [];
    let extractedPoints = shape.extractPoints();
    for (let vecList of [extractedPoints.shape, ...extractedPoints.holes]) {
      let meshLine = new MeshLine();
      let vertices = [];
      for (let i = 0; i < vecList.length; i++) {
        let point = vecList[i];
        vertices.push(new THREE.Vector3(point.x, point.y, 0));
      }
      meshLine.setVertices(vertices);
      meshLineGeometries.push(meshLine);
    }
    let fullGeometry = BufferGeometryUtils.mergeBufferGeometries(
      meshLineGeometries
    );
    return fullGeometry;
  }

  computeStrokeGeometry() {
    let geometries = [];
    for (let shape of this.shapes) {
      geometries.push(this.createMeshLineGeometries(shape));
    }
    return BufferGeometryUtils.mergeBufferGeometries(geometries);
  }

  computeStrokeMaterial() {
    let { strokeOpacity, strokeColor, strokeWidth } = this.style;
    return new MeshLineMaterial({
      color: new THREE.Color(strokeColor),
      opacity: strokeOpacity,
      transparent: true,
      lineWidth: strokeWidth / STROKE_SHRINK_FACTOR,
    });
  }

  updateStrokeMaterial() {
    let { strokeColor, strokeOpacity, strokeWidth } = this.style;
    this.strokeMesh.material.color.set(strokeColor);
    this.strokeMesh.material.opacity = strokeOpacity;
    this.strokeMesh.material.lineWidth = strokeWidth / STROKE_SHRINK_FACTOR;
  }

  computeFillGeometry() {
    return new MobjectFillBufferGeometry(this.shapes, 11);
  }

  updateFillGeometry() {
    this.fillMesh.geometry.update(this.shapes);
  }

  computeFillMaterial() {
    let { fillOpacity, fillColor } = this.style;
    return new THREE.MeshBasicMaterial({
      color: new THREE.Color(fillColor),
      opacity: fillOpacity,
      transparent: true,
    });
  }

  updateFillMaterial() {
    let { fillColor, fillOpacity } = this.style;
    this.fillMesh.material.color.set(fillColor);
    this.fillMesh.material.opacity = fillOpacity;
  }
}

export { Mobject };
