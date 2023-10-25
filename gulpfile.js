"use strict";

//******************************************************************************
//* DEPENDENCIES
//******************************************************************************

// Enable ES6
require("harmonize")(["harmony", "harmony-proxies", "harmony_proxies"]);

var gulp        = require("gulp"),
    gulpTslint  = require("gulp-tslint"),
    tslint      = require("tslint"),
    tsc         = require("gulp-typescript"),
    sourcemaps  = require("gulp-sourcemaps"),
    runSequence = require("run-sequence"),
    del         = require('del');

//******************************************************************************
//* CLEAN
//******************************************************************************
gulp.task("clean", function() {
    return del([
        "src/**/*.d.ts",
        "src/**/*.js",
        "src/**/*.js.map",
        "test/**/*.d.ts",
        "test/**/*.test.js",
        "test/**/*.test.js.map",
        "lib",
        "amd",
        "es"
    ]);
});

//******************************************************************************
//* LINT
//******************************************************************************
gulp.task("lint", function(cb) {
    runSequence(
        "lint-src",
        "lint-test",
        cb
    );
});

gulp.task("lint-src", function() {

    var program = tslint.Linter.createProgram("./tsconfig.json");

    return gulp.src([
        "src/**/**.ts"
    ])
        .pipe(gulpTslint({
            formatter: "stylish",
            program: program
        }))
        .pipe(gulpTslint.report());

});

gulp.task("lint-test", function() {

    var program = tslint.Linter.createProgram("./test/tsconfig.json");

    return gulp.src([
        "test/**/**.test.ts"
    ])
        .pipe(gulpTslint({
            formatter: "stylish",
            program: program
        }))
        .pipe(gulpTslint.report());

});

//******************************************************************************
//* BUILD
//******************************************************************************
var tsLibProject = tsc.createProject("tsconfig.json", { module : "commonjs", typescript: require("typescript") });

gulp.task("build-lib", function() {
    return gulp.src([
        "src/**/*.ts"
    ])
        .pipe(tsLibProject())
        .on("error", function (err) {
            process.exit(1);
        })
        .js.pipe(gulp.dest("lib/"));
});

var tsAmdProject = tsc.createProject("tsconfig.json", { module : "amd", typescript: require("typescript") });

gulp.task("build-amd", function() {
    return gulp.src([
        "src/**/*.ts"
    ])
        .pipe(tsAmdProject())
        .on("error", function (err) {
            process.exit(1);
        })
        .js.pipe(gulp.dest("amd/"));
});

var tsEsProject = tsc.createProject("tsconfig.json", { module : "es2015", typescript: require("typescript") });

gulp.task("build-es", function() {
    return gulp.src([
        "src/**/*.ts"
    ])
        .pipe(tsEsProject())
        .on("error", function (err) {
            process.exit(1);
        })
        .js.pipe(gulp.dest("es/"));
});

var tsDtsProject = tsc.createProject("tsconfig.json", {
    declaration: true,
    noResolve: false,
    typescript: require("typescript")
});

gulp.task("build-dts", function() {
    return gulp.src([
        "src/**/*.ts"
    ])
        .pipe(tsDtsProject())
        .on("error", function (err) {
            process.exit(1);
        })
        .dts.pipe(gulp.dest("lib"));

});

//******************************************************************************
//* TESTS NODE
//******************************************************************************
var tstProject = tsc.createProject("tsconfig.json", {typescript: require("typescript") });

gulp.task("build-src", function() {
    return gulp.src([
        "src/**/*.ts"
    ])
        .pipe(sourcemaps.init())
        .pipe(tstProject())
        .on("error", function (err) {
            process.exit(1);
        })
        .js.pipe(sourcemaps.write(".", {
            sourceRoot: function(file) {
                return file.cwd + '/src';
            }
        }))
        .pipe(gulp.dest("src/"));
});

//******************************************************************************
//* DEFAULT
//******************************************************************************
gulp.task("build", function(cb) {
    runSequence(
        "lint",
        [
            //"build-src",
            //"build-es",
            "build-lib",
            //"build-amd",
            "build-dts"
        ],
        cb
    );
});

gulp.task("default", function (cb) {
    runSequence(
        "clean",
        "build",
        cb);
});
