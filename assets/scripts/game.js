Daleks.GameController = (function() {
    "use strict";

    var _click = "click";

    var painterClasses = {
        doctor: [{
            className: "doctor",
            frames: 4
        }],
        dalek: [{
            className: "dalek",
            frames: 8
        }],
        collision: [{
                className: "dalek-dead-1",
                frames: 1
            },
            {
                className: "dalek-dead-2",
                frames: 1
            },
            {
                className: "dalek-dead-3",
                frames: 1
            },
            {
                className: "dalek-dead-4",
                frames: 1
            }
        ],
        collided: [{
                className: "dalek-dead-1",
                frames: 1
            },
            {
                className: "dalek-dead-2",
                frames: 1
            },
            {
                className: "dalek-dead-1",
                frames: 1
            },
            {
                className: "dalek-dead-2",
                frames: 1
            },
            {
                className: "dalek-dead-1",
                frames: 1
            },
            {
                className: "dalek-dead-2",
                frames: 1
            }
        ],
        rubble: [{
            className: "rubble",
            frames: 4
        }],
        rip: [{
                className: "doctor-dead-1",
                frames: 1
            },
            {
                className: "doctor-dead-2",
                frames: 1
            },
            {
                className: "doctor-dead-1",
                frames: 1
            },
            {
                className: "doctor-dead-2",
                frames: 1
            },
            {
                className: "doctor-dead-1",
                frames: 1
            },
            {
                className: "doctor-dead-2",
                frames: 1
            },
            {
                className: "doctor-dead-3",
                frames: 1,
            },
            {
                className: "doctor-dead-4",
                frames: 1,
            }
        ],
        dead: [{
            className: "dead",
            frames: 8
        }]
    }

    /**
     * The Game Controller
     * 
     * @param {*} canvas the drawing canvas
     */
    function GameController(canvas) {
        this.board = new Daleks.Board(30, 20);
        this.gameData = new Daleks.GameData();
        this.deadDalekSound = new Daleks.Sound('#dead-dalek-sound');
        this.teleportSound = new Daleks.Sound('#teleport-sound');
        this.sonicScrewdriverSound = new Daleks.Sound('#sonic-screwdriver-sound');
        this.winRoundSound = new Daleks.Sound('#win-round-sound');
        this.loseRoundSound = new Daleks.Sound('#lose-round-sound');

        this.teleportSound.volume(0.1);
        this.sonicScrewdriverSound.volume(0.2);
        this.winRoundSound.volume(0.7);

        canvas.append(this.board.getEl());

        this.firstRound = true;
        this.resetGame();

        $(".arena").on("click", function() {});

    }

    GameController.prototype = {
        /**
         * Start the next level
         * 
         */
        startNextLevel: function() {
            this.level++;
            this.screwdriversLeft = 1;
            this.roundOver = false;
            this.board.clear();
            this.isAnimating = false;

            this.doctor = new Daleks.Piece(painterClasses['doctor']);

            this.collision = new Daleks.Piece(painterClasses['collision'], {
                interval: 100
            });

            this.rip = new Daleks.Piece(painterClasses['rip'], {
                interval: 100
            });

            this.collided = new Daleks.Piece(painterClasses['collided'], {
                interval: 100
            });

            this.controls = new Daleks.DoctorControls(
                this.board, {
                    fn: this.handleMove,
                    scope: this
                });

            this.restoreControls();

            this.board.placeDoctor(this.doctor);

            this.rubble = [];
            this.daleks = [];

            for (var iDalek = 0; iDalek < 5 * this.level; iDalek++) {
                this.daleks[iDalek] = new Daleks.Piece(painterClasses['dalek']);
                this.board.placeDalek(this.daleks[iDalek], this.doctor);
            }

            this.draw();

        },

        // callback for an arrow being clicked or other move instruction
        handleMove: function(dir) {
            this.controls.moveDoctor(this.doctor, dir);
            this.updateWorld();
        },

        // Update the css for all element
        draw: function() {
            for (var iRubble in this.rubble) {
                this.rubble[iRubble].draw();
            }

            this.updateControls(); // draws controls as well

        },

        //----------------------------------------
        // enable buttons and keyboard event handlers
        enableControls: function() {
            this.disableControls(); // make sure no handler leaks
            var self = this;
            $(".button").removeClass("disabled");

            $("body").on("keydown",
                function(e) {
                    switch (e.which) {
                        case 76:
                            self.lastStand();
                            break;
                        case 83:
                            self.sonicScrewDriver();
                            break;
                        case 84:
                            self.teleport();
                            break;
                    }
                });

            // data-name is the function to call on click

            $(".actions").on(_click, "a", function(e) {
                e.preventDefault();

                var fn = $(e.target).closest('a').data('name');
                if (self[fn]) {
                    self[fn].call(self);
                }

                self.firstRound = false;
                return false;
            });

            this.updateScrewDriver();
        },

        disableControls: function() {

            this.controls.disable();

            $("body").off("keydown");
            $(".actions").off(_click, "a");
            $(".button").addClass("disabled");

        },

        //----------------------------------------
        // place the control arrows in legal places
        // Take into acconut things to block arrows: daleks, borders, rubble
        updateControls: function() {
            if (!this.isLastStand) {
                this.controls.update(this.doctor, this.board,
                    this.daleks.concat(this.rubble));
            }
        },

        // @return true of any daleks or the doctor are an in-progress animation
        animationInProgress: function() {
            for (var dalek in this.daleks) {
                if (this.daleks[dalek].isAnimating) {
                    return true;
                }
            }

            return this.doctor.isAnimating || this.isAnimating;
        },

        //----------------------------------------
        // the doctor made a move, respond
        updateWorld: function() {

            var self = this;

            if (this.checkDaleks()) {
                return;
            }

            var tryAgain = function() {
                self.updateWorld();
            };

            // Wait until doctor has moved
            if (this.animationInProgress()) {
                setTimeout(tryAgain, 100);
                return;
            }

            this.moveDaleks();
            this.checkWorld();

        },

        checkWorld: function() {

            // can this logic be centralized (checkConditionAndTryAgain() )
            var self = this;
            var tryAgain = function() {
                self.checkWorld();
            };

            // wait until animations done
            if (this.animationInProgress()) {
                setTimeout(tryAgain, 100);
                return;
            }

            if (this.checkCollisions()) {
                return;
            }

            if (!this.roundOver) {
                this.draw();
            }

            // check for victory
            var victory = true;

            for (var iDalek in this.daleks) {
                if (this.daleks[iDalek]) {
                    victory = false;
                    break;
                }
            }

            if (victory) {
                this.winRound();
            }

            // keep going until round over
            if (!this.roundOver && this.isLastStand) {
                this.updateWorld();
            }
        },

        /**
         * Check if the daleks have won
         * 
         * @returns 'true' no nastly daleks collided with the doctor
         */
        checkDaleks: function() {
            for (var iDalek in this.daleks) {
                var dalek = this.daleks[iDalek];

                if (dalek.checkMovement(this.doctor)) {

                    this.loseGame(dalek);

                    return true;

                }

            }

            return false;

        },

        /**
         * Move the Daleks
         * 
         */
        moveDaleks: function() {
            for (var iDalek in this.daleks) { // not a for loop beacuse this array is sparse
                var dalek = this.daleks[iDalek];
                dalek.moveTowards(this.doctor);
            }
        },

        //----------------------------------------
        // did this dalek run into the Doctor or rubble?
        checkObjectCollision: function(dalek) {
            var results = [];

            for (var iRubble in this.rubble) {
                if (dalek.collidedWith(this.rubble[iRubble])) {
                    results.push({
                        type: 2,
                        object: this.rubble[iRubble],
                        index: iRubble
                    });

                }

            }

            for (var iDalek in this.daleks) {

                if (dalek.collidedWith(this.daleks[iDalek])) {

                    results.push({
                        type: 3,
                        object: this.daleks[iDalek],
                        index: iDalek
                    });

                }

            }

            return results;

        },

        /**
         * make rubble where Daleks impacted each other
         * check for impact with existing landmarks first, 
         * then with other daleks - which will make a landmark for others to hit
         * 
         */
        checkCollisions: function() {
            for (var iDalek in this.daleks) {
                var pos = this.daleks[iDalek].pos;
                var exterminated = false;
                var results = this.checkObjectCollision(this.daleks[iDalek]);

                for (var iResult in results) {
                    var result = results[iResult];

                    if (result.type == 2) {

                        var rubble = result.object;

                        rubble.hide();

                        this.board.placeCollision(this.collision, pos);
                        this.collision.setPosition(pos);
                        this.collision.show();
                        if (!exterminated) {

                            this.removeDalek(iDalek);
                            this.deadDalekSound.play();

                        }

                        this.collision.animate({
                                rubble: rubble
                            },
                            function(piece, args) {

                                piece.hide();
                                args.rubble.show();

                            });

                        exterminated = true;

                    } else if (result.type == 3) {

                        this.board.placeCollision(this.collision, pos);
                        this.collision.setPosition(pos);

                        this.collision.show();

                        var rubble = new Daleks.Piece(painterClasses['rubble']);
                        this.board.placeRubble(rubble, pos);

                        if (!exterminated) {
                            this.removeDalek(iDalek);
                            this.deadDalekSound.play();
                        }

                        this.removeDalek(result.index);

                        rubble.hide();

                        this.rubble[this.rubble.length] = rubble;

                        this.collision.animate({
                                rubble: rubble
                            },
                            function(piece, args) {

                                piece.hide();
                                args.rubble.show();

                            });

                    }

                    exterminated = true;

                }

            }

        },

        /**
         * remove the dalek from the board it has been exterminated
         * @param {*} index the daleks index on the board
         */
        removeDalek: function(index) {
            this.board.remove(this.daleks[index]);
            delete this.daleks[index];
            this.updateScore(1);
        },

        /**
         * Update the Score
         * @param {*} value 
         */
        updateScore: function(value) {
            this.score += value;
            $("#score").text(this.score);
        },


        //----------------------------------------
        // randomly jump doctor, no guarantee of landing place
        teleport: function() {
            this.isAnimating = true;

            this.disableControls();

            var epicenter = this.doctor.getScaledCenterPos();

            this.board.remove(this.doctor);

            this.teleportSound.play();

            var disappear = new Daleks.Animation.SonicPulse({
                container: this.board.getEl(),
                epicenter: epicenter,
                innerDiameter: 48,
                outerDiameter: 480,
                callback: {
                    success: this.teleportReappear,
                    context: this
                }
            });

            disappear.start();
        },

        //----------------------------------------
        // reppear after disappear is done
        teleportReappear: function() {

            // someplace brand new!
            this.board.replaceDoctor(this.doctor, this.daleks, this.rubble);
            var epicenter = this.doctor.getScaledCenterPos();

            // depends on being called with "this" as context
            var reappearDone = function() {
                this.doneAnimating();
                this.enableControls();
                this.updateWorld();
            };

            var reappear = new Daleks.Animation.SonicPulse({
                container: this.board.getEl(),
                epicenter: epicenter,
                innerDiameter: 48,
                outerDiameter: 480,
                reverse: true,
                callback: {
                    success: reappearDone,
                    context: this
                }
            });

            reappear.start();
        },

        doneAnimating: function() {
            this.isAnimating = false;
        },

        //----------------------------------------
        // move Daleks inexorably towards the Doctor
        lastStand: function() {
            this.isLastStand = true;
            this.controls.disable();
            this.disableControls();
            $(".button").addClass("disabled");

            this.updateWorld();
        },

        // oops! User didn't mean to last stand, cancel it.
        restoreControls: function() {
            this.isLastStand = false;
            this.enableControls();
        },

        // hide screw driver button if used
        updateScrewDriver: function() {
            if (this.screwdriversLeft <= 0) {
                $(".button[data-name=sonicScrewDriver]").addClass("disabled");
            }
        },

        //----------------------------------------
        // kill the nearest daleks and continue
        sonicScrewDriver: function() {

            if (this.screwdriversLeft <= 0) {
                return;
            }

            this.screwdriversLeft--;
            this.updateScrewDriver();

            var x = this.doctor.pos.x;
            var y = this.doctor.pos.y;

            var epicenter = this.doctor.getScaledCenterPos();

            this.disableControls();

            this.sonicScrewdriverSound.play();

            // depends on being called with "this" as context
            var reappearDone = function() {
                this.doneAnimating();


                for (var i in this.daleks) {
                    var pos = this.daleks[i].pos;
                    if (((pos.x === x) || (pos.x === x + 1) || (pos.x === x - 1)) &&
                        ((pos.y === y) || (pos.y === y + 1) || (pos.y === y - 1))) {
                        this.removeDalek(i);
                    }
                }

                this.enableControls();
                this.updateWorld();

            };

            var animation = new Daleks.Animation.SonicPulse({
                container: this.board.getEl(),
                epicenter: epicenter,
                innerDiameter: 16,
                outerDiameter: 48,
                callback: {
                    success: reappearDone,
                    context: this
                }

            });

            animation.start();


        },

        /**
         * Won the round
         */
        winRound: function() {
            this.endRound();
            this.winRoundSound.play();

            $(".victory").show();

            var self = this;

            setTimeout(function() {

                self.startNextLevel();

            }, 1000);
        },


        /**
         * Oh Dear - the daleks have won
         * 
         * @param {*} dalek this dalek has succeeded
         */
        loseGame: async function(dalek) {

            function animateDalek(self, dalek) {

                self.board.placeCollided(self.collided, dalek.pos);
                self.collided.setPosition(dalek.pos);
                dalek.hide();
                self.collided.show();
                self.loseRoundSound.play();

                return new Promise(resolve => {

                    self.collided.animate({
                            dalek: dalek
                        },
                        function(piece, args) {

                            piece.hide();
                            args.dalek.show();

                            resolve(true);

                        });

                });

            }

            function animateLoss(self) {

                self.board.placeRip(self.rip, self.doctor.pos);
                self.rip.setPosition(self.doctor.pos);
                self.doctor.hide();
                self.rip.show();

                return new Promise(resolve => {

                    self.rip.animate({
                            doctor: self.doctor
                        },
                        function(piece, args) {

                            piece.hide();
                            args.doctor.getEl().addClass("dead");
                            args.doctor.show();

                            self.gameData.setHighScore(self.score);

                            resolve(true);

                        });

                });
            }

            this.endRound();

            animateDalek(this, dalek);
            await animateLoss(this);

            setTimeout((self) => {
                self.resetGame();
                self.startNextLevel();
            }, 1000, this);

        },

        /**
         * End of Round
         */
        endRound: function() {
            this.roundOver = true;
            this.restoreControls(); // reset to normal state (ex: panic button)
            this.disableControls();
        },

        resetGame: function() {
            this.score = 0;
            this.level = 0;

            $("#score").text(0);
        }

    };

    return GameController;
})();

$(() => {
    var game = new Daleks.GameController($(".arena"));

    window.addEventListener("mousedown", event => {

        if (event.target.classList && event.target.classList.contains('drop_menu_item')) {
            var id = event.target.innerText.trimStart().toLowerCase();

            $(`#${id}`).css('display', 'block');

            event.target.style.backgroundColor = 'black';
            event.target.style.color = 'white';

        }

        if (event.target.id == 'about') {
            $('#about').css('filter', 'invert(100%)');
            $('#about_menu')[0].style.backgroundColor = 'black';
            $('#about_menu')[0].style.color = 'white';
        }

    });

    window.addEventListener("mouseup", event => {
        var items = document.getElementsByClassName('drop_menu_item');
        console.log(event.target);

        for (var item in items) {
            if (items[item].innerText) {
                var id = items[item].innerText.trimStart().toLowerCase();

                $(`#${id}`).css('display', 'none');

                items[item].style.backgroundColor = 'white';
                items[item].style.color = 'black';

            }

        }

        if (event.target.id && event.target.id == 'about') {
            $('#about').css('filter', 'invert(0%)');
            $('#about_dialog').css('opacity', '100%');

            $('#about_menu')[0].style.backgroundColor = 'white';
            $('#about_menu')[0].style.color = 'black';

            $('#about_dialog').css('display', 'inline-block');

            setTimeout(function() {
                $('#about_dialog').css('opacity', '0%');
                $('#about_dialog').css('transition', 'all 0.5s ease-in-out');
                setTimeout(function() {
                    $('#about_dialog').css('display', 'none');
                }, 1000);

            }, 2000);

        } else if (event.target.id && event.target.id.startsWith('quit')) {
            window.api.quit();
        } else if (event.target.id && event.target.id.startsWith('teleport')) {
            game.teleport();
        } else if (event.target.id && event.target.id.startsWith('laststand')) {
            game.lastStand();
        } else if (event.target.id && event.target.id.startsWith('screwdriver')) {
            game.sonicScrewDriver();
        } else if (event.target.id && event.target.id.startsWith('giveup')) {
            game.resetGame();
            game.startNextLevel();
        }

    });

    game.startNextLevel();

});